DROP POLICY "Users can update own or team checks" ON public.cash_checks;
CREATE POLICY "Users can update own or team checks" ON public.cash_checks FOR UPDATE TO authenticated
USING (can_access_team_resource(auth.uid(), user_id))
WITH CHECK (can_access_team_resource(auth.uid(), user_id));

DROP POLICY "Users can update own or team contract items" ON public.contract_items;
CREATE POLICY "Users can update own or team contract items" ON public.contract_items FOR UPDATE TO authenticated
USING (can_access_team_resource(auth.uid(), user_id))
WITH CHECK (can_access_team_resource(auth.uid(), user_id));

DROP POLICY "Update own or team norms" ON public.material_norms;
CREATE POLICY "Update own or team norms" ON public.material_norms FOR UPDATE TO authenticated
USING (can_access_team_resource(auth.uid(), user_id))
WITH CHECK (can_access_team_resource(auth.uid(), user_id));

DROP POLICY "personnel update team" ON public.personnel;
CREATE POLICY "personnel update team" ON public.personnel FOR UPDATE TO authenticated
USING (can_access_team_resource(auth.uid(), user_id))
WITH CHECK (can_access_team_resource(auth.uid(), user_id));

DROP POLICY "Update own or team reminders" ON public.reminders;
CREATE POLICY "Update own or team reminders" ON public.reminders FOR UPDATE TO authenticated
USING (can_access_team_resource(auth.uid(), user_id))
WITH CHECK (can_access_team_resource(auth.uid(), user_id));