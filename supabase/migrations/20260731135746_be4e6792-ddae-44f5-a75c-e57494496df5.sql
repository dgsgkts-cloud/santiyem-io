-- 1. profiles.email (team directory needs the e-mail)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
   SET email = u.email
  FROM auth.users u
 WHERE u.id = p.user_id AND p.email IS DISTINCT FROM u.email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, title, city, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'title', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'city', ''),
    CASE WHEN NEW.email = 'info@goktasglobal.com' THEN 'admin' ELSE 'free' END,
    NEW.email
  );
  RETURN NEW;
END;
$function$;

-- 2. membership access state
ALTER TABLE public.office_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'office_members_status_check'
  ) THEN
    ALTER TABLE public.office_members
      ADD CONSTRAINT office_members_status_check
      CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

-- owners may change role / status of non-owner members
DROP POLICY IF EXISTS "Owner can update members" ON public.office_members;
CREATE POLICY "Owner can update members"
ON public.office_members
FOR UPDATE
TO authenticated
USING (
  role <> 'owner'
  AND EXISTS (
    SELECT 1 FROM public.office_teams t
     WHERE t.id = office_members.team_id AND t.owner_id = auth.uid()
  )
)
WITH CHECK (
  role IN ('editor', 'viewer')
  AND status IN ('active', 'suspended')
  AND EXISTS (
    SELECT 1 FROM public.office_teams t
     WHERE t.id = office_members.team_id AND t.owner_id = auth.uid()
  )
);

-- 3. suspension is really enforced
CREATE OR REPLACE FUNCTION public.is_member_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.office_members
     WHERE user_id = _user_id AND status = 'suspended'
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_same_team(_user_id_a uuid, _user_id_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.office_members a
    JOIN public.office_members b ON a.team_id = b.team_id
    WHERE a.user_id = _user_id_a AND b.user_id = _user_id_b
      AND a.status = 'active' AND b.status = 'active'
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_access_team_resource(_accessor_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (_accessor_id = _owner_id AND NOT public.is_member_suspended(_accessor_id))
      OR public.is_same_team(_accessor_id, _owner_id)
$function$;

CREATE OR REPLACE FUNCTION public.can_access_project(_user uuid, _project uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT NOT public.is_member_suspended(_user)
     AND (
       public.is_project_owner(_user, _project) OR EXISTS (
         SELECT 1 FROM public.project_members m
          WHERE m.project_id = _project AND m.user_id = _user
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.has_project_permission(_user uuid, _project uuid, _key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.project_role;
  v_override boolean;
BEGIN
  IF public.is_member_suspended(_user) THEN
    RETURN false;
  END IF;

  IF public.is_project_owner(_user, _project) THEN
    RETURN true;
  END IF;

  SELECT role INTO v_role FROM public.project_members
   WHERE user_id = _user AND project_id = _project LIMIT 1;
  IF v_role IS NULL THEN RETURN false; END IF;

  SELECT granted INTO v_override FROM public.project_member_permissions
   WHERE user_id = _user AND project_id = _project AND permission_key = _key LIMIT 1;
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;

  RETURN public.role_default_permission(v_role, _key);
END;
$function$;

-- 4. invitation expiry + duplicate protection
ALTER TABLE public.office_invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days');

CREATE UNIQUE INDEX IF NOT EXISTS office_invitations_pending_email_idx
  ON public.office_invitations (team_id, lower(email))
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.check_pending_invitations(_user_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE inv RECORD;
BEGIN
  FOR inv IN
    SELECT id, team_id, role FROM public.office_invitations
     WHERE lower(email) = lower(_email)
       AND status = 'pending'
       AND expires_at > now()
  LOOP
    INSERT INTO public.office_members (team_id, user_id, role)
    VALUES (inv.team_id, _user_id, inv.role)
    ON CONFLICT (team_id, user_id) DO NOTHING;
    UPDATE public.office_invitations SET status = 'accepted' WHERE id = inv.id;
  END LOOP;
END;
$function$;