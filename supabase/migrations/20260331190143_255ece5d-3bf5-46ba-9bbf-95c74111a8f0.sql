
-- Update projects RLS
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;

CREATE POLICY "Users can view own or team projects"
ON public.projects FOR SELECT TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can insert projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team projects"
ON public.projects FOR UPDATE TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Owner can delete projects"
ON public.projects FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Update project_hakedis RLS
DROP POLICY IF EXISTS "Users can manage own hakedis" ON public.project_hakedis;

CREATE POLICY "View own or team hakedis"
ON public.project_hakedis FOR SELECT TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Insert own hakedis"
ON public.project_hakedis FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own or team hakedis"
ON public.project_hakedis FOR UPDATE TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Delete own hakedis"
ON public.project_hakedis FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Update reminders RLS
DROP POLICY IF EXISTS "Users can manage own reminders" ON public.reminders;

CREATE POLICY "View own or team reminders"
ON public.reminders FOR SELECT TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Insert own reminders"
ON public.reminders FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own or team reminders"
ON public.reminders FOR UPDATE TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Delete own reminders"
ON public.reminders FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Update project_milestones RLS
DROP POLICY IF EXISTS "Users can manage own milestones" ON public.project_milestones;

CREATE POLICY "View own or team milestones"
ON public.project_milestones FOR SELECT TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Insert own milestones"
ON public.project_milestones FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own or team milestones"
ON public.project_milestones FOR UPDATE TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Delete own milestones"
ON public.project_milestones FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Update project_notes RLS
DROP POLICY IF EXISTS "Users can manage own project notes" ON public.project_notes;

CREATE POLICY "View own or team notes"
ON public.project_notes FOR SELECT TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Insert own notes"
ON public.project_notes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own or team notes"
ON public.project_notes FOR UPDATE TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Delete own notes"
ON public.project_notes FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Update project_files RLS
DROP POLICY IF EXISTS "Users can manage own project files" ON public.project_files;

CREATE POLICY "View own or team files"
ON public.project_files FOR SELECT TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Insert own files"
ON public.project_files FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own or team files"
ON public.project_files FOR UPDATE TO authenticated
USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Delete own files"
ON public.project_files FOR DELETE TO authenticated
USING (user_id = auth.uid());
