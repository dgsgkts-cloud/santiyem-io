DROP POLICY IF EXISTS "User can insert self as member via accepted invite" ON public.project_members;

CREATE POLICY "User can insert self as member via accepted invite"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role <> 'owner'::project_role
  AND EXISTS (
    SELECT 1
    FROM public.project_invitations i
    WHERE i.project_id = project_members.project_id
      AND i.status = 'pending'
      AND i.expires_at > now()
      AND i.role = project_members.role
      AND lower(coalesce(i.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);