
-- ============================================================
-- RBAC: Project Roles, Members, Permissions, Invitations
-- ============================================================

-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.project_role AS ENUM (
    'owner', 'manager', 'site_engineer', 'accountant',
    'subcontractor', 'worker', 'landowner'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.project_role NOT NULL DEFAULT 'worker',
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Only one owner per project
CREATE UNIQUE INDEX IF NOT EXISTS project_members_one_owner
  ON public.project_members(project_id) WHERE role = 'owner';

CREATE INDEX IF NOT EXISTS project_members_user_idx ON public.project_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 3. project_member_permissions (per-person overrides)
CREATE TABLE IF NOT EXISTS public.project_member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  set_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, permission_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_member_permissions TO authenticated;
GRANT ALL ON public.project_member_permissions TO service_role;
ALTER TABLE public.project_member_permissions ENABLE ROW LEVEL SECURITY;

-- 4. project_invitations
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  email text,
  phone text,
  role public.project_role NOT NULL DEFAULT 'worker',
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS project_invitations_proj_idx ON public.project_invitations(project_id);
CREATE INDEX IF NOT EXISTS project_invitations_email_idx ON public.project_invitations(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invitations TO authenticated;
GRANT ALL ON public.project_invitations TO service_role;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions (SECURITY DEFINER, fixed search_path)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_project_role(_user uuid, _project uuid)
RETURNS public.project_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.project_members
   WHERE user_id = _user AND project_id = _project
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_user uuid, _project uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = _project AND p.user_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
     WHERE m.project_id = _project AND m.user_id = _user AND m.role = 'owner'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_project_manager_or_owner(_user uuid, _project uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_project_owner(_user, _project) OR EXISTS (
    SELECT 1 FROM public.project_members m
     WHERE m.project_id = _project AND m.user_id = _user AND m.role = 'manager'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(_user uuid, _project uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_project_owner(_user, _project) OR EXISTS (
    SELECT 1 FROM public.project_members m
     WHERE m.project_id = _project AND m.user_id = _user
  )
$$;

-- Role-template default permissions
CREATE OR REPLACE FUNCTION public.role_default_permission(_role public.project_role, _key text)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'owner' THEN true
    WHEN 'manager' THEN CASE _key
      WHEN 'view_financials' THEN false
      WHEN 'manage_finance' THEN false
      WHEN 'view_costs' THEN true
      WHEN 'view_payments' THEN true
      WHEN 'view_diary' THEN true
      WHEN 'view_photos' THEN true
      WHEN 'view_attendance_all' THEN true
      WHEN 'view_progress' THEN true
      WHEN 'manage_members' THEN true
      ELSE false END
    WHEN 'site_engineer' THEN CASE _key
      WHEN 'view_diary' THEN true
      WHEN 'view_photos' THEN true
      WHEN 'view_attendance_all' THEN true
      WHEN 'view_progress' THEN true
      WHEN 'edit_diary' THEN true
      WHEN 'edit_attendance' THEN true
      ELSE false END
    WHEN 'accountant' THEN CASE _key
      WHEN 'view_financials' THEN true
      WHEN 'view_costs' THEN true
      WHEN 'view_payments' THEN true
      WHEN 'manage_finance' THEN true
      ELSE false END
    WHEN 'subcontractor' THEN CASE _key
      WHEN 'view_attendance_own_team' THEN true
      WHEN 'view_payments_own' THEN true
      ELSE false END
    WHEN 'worker' THEN CASE _key
      WHEN 'view_attendance_own' THEN true
      ELSE false END
    WHEN 'landowner' THEN CASE _key
      WHEN 'view_progress' THEN true
      WHEN 'view_photos' THEN true
      ELSE false END
    ELSE false END
$$;

CREATE OR REPLACE FUNCTION public.has_project_permission(_user uuid, _project uuid, _key text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.project_role;
  v_override boolean;
BEGIN
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
$$;

-- ============================================================
-- RLS Policies for new tables
-- ============================================================

-- project_members
CREATE POLICY "Members can view project membership"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "Owner/manager can insert members"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_project_manager_or_owner(auth.uid(), project_id)
    AND role <> 'owner'
  );

-- Allow a user to insert themselves (used by accept_project_invitation via SECURITY DEFINER, but also fallback)
CREATE POLICY "User can insert self as member via accepted invite"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND role <> 'owner' AND EXISTS (
      SELECT 1 FROM public.project_invitations i
      WHERE i.project_id = project_members.project_id
        AND i.status = 'pending'
        AND (lower(coalesce(i.email,'')) = lower(coalesce((auth.jwt() ->> 'email'),'')))
    )
  );

CREATE POLICY "Owner/manager can update members"
  ON public.project_members FOR UPDATE TO authenticated
  USING (public.is_project_manager_or_owner(auth.uid(), project_id))
  WITH CHECK (role <> 'owner');

CREATE POLICY "Owner/manager can remove members"
  ON public.project_members FOR DELETE TO authenticated
  USING (
    public.is_project_manager_or_owner(auth.uid(), project_id)
    AND role <> 'owner'
  );

-- project_member_permissions
CREATE POLICY "Members can view permissions of project"
  ON public.project_member_permissions FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));

-- Only owner can change financial overrides; manager can change non-financial
CREATE POLICY "Owner/manager can write member permissions"
  ON public.project_member_permissions FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN permission_key IN ('view_financials','manage_finance','view_costs','view_payments')
        THEN public.is_project_owner(auth.uid(), project_id)
      ELSE public.is_project_manager_or_owner(auth.uid(), project_id)
    END
  );

CREATE POLICY "Owner/manager can update member permissions"
  ON public.project_member_permissions FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN permission_key IN ('view_financials','manage_finance','view_costs','view_payments')
        THEN public.is_project_owner(auth.uid(), project_id)
      ELSE public.is_project_manager_or_owner(auth.uid(), project_id)
    END
  );

CREATE POLICY "Owner/manager can delete member permissions"
  ON public.project_member_permissions FOR DELETE TO authenticated
  USING (
    CASE
      WHEN permission_key IN ('view_financials','manage_finance','view_costs','view_payments')
        THEN public.is_project_owner(auth.uid(), project_id)
      ELSE public.is_project_manager_or_owner(auth.uid(), project_id)
    END
  );

-- project_invitations
CREATE POLICY "Members can view invitations"
  ON public.project_invitations FOR SELECT TO authenticated
  USING (
    public.can_access_project(auth.uid(), project_id)
    OR lower(coalesce(email,'')) = lower(coalesce((auth.jwt() ->> 'email'),''))
  );

CREATE POLICY "Owner/manager can create invitations"
  ON public.project_invitations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_project_manager_or_owner(auth.uid(), project_id)
    AND invited_by = auth.uid()
    AND role <> 'owner'
  );

CREATE POLICY "Owner/manager can update invitations"
  ON public.project_invitations FOR UPDATE TO authenticated
  USING (public.is_project_manager_or_owner(auth.uid(), project_id));

CREATE POLICY "Owner/manager can delete invitations"
  ON public.project_invitations FOR DELETE TO authenticated
  USING (public.is_project_manager_or_owner(auth.uid(), project_id));

-- ============================================================
-- Public RPC: accept invitation by token (anyone signed-in)
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_project_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inv RECORD;
  uid uuid := auth.uid();
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  user_email := lower(coalesce((auth.jwt() ->> 'email'),''));

  SELECT * INTO inv FROM public.project_invitations
   WHERE token = _token AND status = 'pending' AND expires_at > now()
   LIMIT 1;

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;

  IF inv.email IS NOT NULL AND lower(inv.email) <> user_email THEN
    RAISE EXCEPTION 'Invitation email does not match';
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role, invited_by)
  VALUES (inv.project_id, uid, inv.role, inv.invited_by)
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.project_invitations
     SET status = 'accepted', accepted_at = now()
   WHERE id = inv.id;

  RETURN inv.project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_project_invitation(text) TO authenticated;

-- RPC: set role (guards: cannot make owner; manager cannot promote to manager-of-owner etc.)
CREATE OR REPLACE FUNCTION public.set_project_member_role(
  _project uuid, _user uuid, _role public.project_role
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _role = 'owner' THEN RAISE EXCEPTION 'Cannot assign owner role'; END IF;
  IF NOT public.is_project_manager_or_owner(uid, _project) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Manager cannot demote/modify the owner
  IF EXISTS (
    SELECT 1 FROM public.project_members
     WHERE project_id = _project AND user_id = _user AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Cannot modify owner';
  END IF;

  UPDATE public.project_members
     SET role = _role
   WHERE project_id = _project AND user_id = _user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_project_member_role(uuid, uuid, public.project_role) TO authenticated;

-- RPC: set permission override (owner-only for financial keys)
CREATE OR REPLACE FUNCTION public.set_project_member_permission(
  _project uuid, _user uuid, _key text, _granted boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  financial boolean := _key IN ('view_financials','manage_finance','view_costs','view_payments');
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF financial THEN
    IF NOT public.is_project_owner(uid, _project) THEN
      RAISE EXCEPTION 'Only the owner can change financial visibility';
    END IF;
  ELSE
    IF NOT public.is_project_manager_or_owner(uid, _project) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  INSERT INTO public.project_member_permissions (project_id, user_id, permission_key, granted, set_by)
  VALUES (_project, _user, _key, _granted, uid)
  ON CONFLICT (project_id, user_id, permission_key)
  DO UPDATE SET granted = EXCLUDED.granted, set_by = uid, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_project_member_permission(uuid, uuid, text, boolean) TO authenticated;

-- RPC: remove member (owner cannot be removed)
CREATE OR REPLACE FUNCTION public.remove_project_member(_project uuid, _user uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_project_manager_or_owner(uid, _project) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.project_members
     WHERE project_id = _project AND user_id = _user AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Cannot remove owner';
  END IF;

  DELETE FROM public.project_members
   WHERE project_id = _project AND user_id = _user;

  DELETE FROM public.project_member_permissions
   WHERE project_id = _project AND user_id = _user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_project_member(uuid, uuid) TO authenticated;

-- ============================================================
-- Auto-seed: when a project is created, owner becomes member
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_project_owner_member()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_project_owner ON public.projects;
CREATE TRIGGER trg_seed_project_owner
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.seed_project_owner_member();

-- Backfill existing projects with owner membership
INSERT INTO public.project_members (project_id, user_id, role, invited_by)
SELECT p.id, p.user_id, 'owner', p.user_id
  FROM public.projects p
  ON CONFLICT (project_id, user_id) DO NOTHING;

-- ============================================================
-- Widen SELECT access on key project-context tables so
-- non-team members who are invited project_members can read.
-- (Existing policies remain; we add additive policies.)
-- ============================================================

-- projects
CREATE POLICY "Project members can view project"
  ON public.projects FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), id));

-- worker_attendance (project_id is uuid)
CREATE POLICY "Project members can view attendance"
  ON public.worker_attendance FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));

-- site_diary_entries
CREATE POLICY "Project members can view diary"
  ON public.site_diary_entries FOR SELECT TO authenticated
  USING (public.can_access_project(auth.uid(), project_id));
