DROP POLICY IF EXISTS "Owner can update team" ON public.office_teams;
CREATE POLICY "Owner can update team" ON public.office_teams
FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());