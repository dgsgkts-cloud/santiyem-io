-- 1. office_members: stop self-granted membership/ownership of arbitrary teams.
DROP POLICY IF EXISTS "Users can join teams" ON public.office_members;

CREATE POLICY "Users can join teams via invitation"
ON public.office_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Workspace creator seeds themselves as owner of the team they just created.
    (
      role = 'owner'
      AND EXISTS (
        SELECT 1 FROM public.office_teams t
        WHERE t.id = office_members.team_id
          AND t.owner_id = auth.uid()
      )
    )
    -- Everyone else must hold a pending invitation for their own email,
    -- and may only take the role the invitation grants (never 'owner').
    OR (
      role <> 'owner'
      AND EXISTS (
        SELECT 1 FROM public.office_invitations i
        WHERE i.team_id = office_members.team_id
          AND lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND i.status = 'pending'
          AND i.role = office_members.role
      )
    )
  )
);

-- 2. profiles: block self-service role/plan escalation at the policy level too
--    (the BEFORE UPDATE trigger already resets these; this is defence in depth).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (
    SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()
  )
  AND plan IS NOT DISTINCT FROM (
    SELECT p.plan FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- 3. Team-scoped tables: an UPDATE must leave the row inside the caller's team.
ALTER POLICY "Users can update own or team payments cp" ON public.cash_payments
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));

ALTER POLICY "Users can update own or team contracts" ON public.contracts
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));

ALTER POLICY "Update own or team e-invoices" ON public.e_invoices
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));

ALTER POLICY "Update own or team materials" ON public.materials
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));

ALTER POLICY "Update own or team entries" ON public.material_entries
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));

ALTER POLICY "Users can update own or team subcontractors" ON public.subcontractors
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));

ALTER POLICY "Users can update own or team expenses" ON public.project_expenses
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));

ALTER POLICY "Update own or team hakedis" ON public.project_hakedis
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (can_access_team_resource(auth.uid(), user_id));