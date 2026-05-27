DROP POLICY IF EXISTS "Users can update own or team diary entries" ON public.site_diary_entries;
CREATE POLICY "Users can update own diary entries"
ON public.site_diary_entries
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());