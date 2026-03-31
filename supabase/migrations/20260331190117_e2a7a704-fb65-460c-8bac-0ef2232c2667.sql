
-- 1) Office Teams table
CREATE TABLE public.office_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Ofisim',
  max_members integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.office_teams ENABLE ROW LEVEL SECURITY;

-- 2) Office Members table
CREATE TABLE public.office_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.office_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
ALTER TABLE public.office_members ENABLE ROW LEVEL SECURITY;

-- 3) Office Invitations table
CREATE TABLE public.office_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.office_teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, email)
);
ALTER TABLE public.office_invitations ENABLE ROW LEVEL SECURITY;

-- 4) Tasks table (Kanban)
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  team_id uuid REFERENCES public.office_teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5) Add assigned_to to reminders
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6) Helper functions (tables exist now)
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT team_id FROM public.office_members WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_same_team(_user_id_a uuid, _user_id_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.office_members a
    JOIN public.office_members b ON a.team_id = b.team_id
    WHERE a.user_id = _user_id_a AND b.user_id = _user_id_b
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_team_resource(_accessor_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _accessor_id = _owner_id OR public.is_same_team(_accessor_id, _owner_id)
$$;

CREATE OR REPLACE FUNCTION public.check_pending_invitations(_user_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE inv RECORD;
BEGIN
  FOR inv IN SELECT id, team_id, role FROM public.office_invitations WHERE email = _email AND status = 'pending'
  LOOP
    INSERT INTO public.office_members (team_id, user_id, role)
    VALUES (inv.team_id, _user_id, inv.role)
    ON CONFLICT (team_id, user_id) DO NOTHING;
    UPDATE public.office_invitations SET status = 'accepted' WHERE id = inv.id;
  END LOOP;
END;
$$;

-- 7) RLS Policies for new tables
CREATE POLICY "Team members can view their team"
ON public.office_teams FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.office_members WHERE team_id = id AND user_id = auth.uid()));

CREATE POLICY "Owner can update team"
ON public.office_teams FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams"
ON public.office_teams FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members can view members"
ON public.office_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.office_members om WHERE om.team_id = office_members.team_id AND om.user_id = auth.uid()));

CREATE POLICY "Owner can manage members"
ON public.office_members FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.office_members om WHERE om.team_id = office_members.team_id AND om.user_id = auth.uid() AND om.role = 'owner'));

CREATE POLICY "Users can join teams"
ON public.office_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can view invitations"
ON public.office_invitations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.office_members om WHERE om.team_id = office_invitations.team_id AND om.user_id = auth.uid()));

CREATE POLICY "Owner can manage invitations"
ON public.office_invitations FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.office_members om WHERE om.team_id = office_invitations.team_id AND om.user_id = auth.uid() AND om.role = 'owner'));

CREATE POLICY "Owner can update invitations"
ON public.office_invitations FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.office_members om WHERE om.team_id = office_invitations.team_id AND om.user_id = auth.uid() AND om.role = 'owner'));

CREATE POLICY "Owner can delete invitations"
ON public.office_invitations FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.office_members om WHERE om.team_id = office_invitations.team_id AND om.user_id = auth.uid() AND om.role = 'owner'));

-- Tasks RLS
CREATE POLICY "Users can view tasks"
ON public.tasks FOR SELECT TO authenticated
USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.can_access_team_resource(auth.uid(), created_by));

CREATE POLICY "Users can create tasks"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.can_access_team_resource(auth.uid(), created_by));

CREATE POLICY "Creator can delete tasks"
ON public.tasks FOR DELETE TO authenticated
USING (created_by = auth.uid());
