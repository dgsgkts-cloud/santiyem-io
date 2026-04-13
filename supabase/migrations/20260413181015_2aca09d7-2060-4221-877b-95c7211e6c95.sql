
-- 1. Fix worker_attendance: restrict anon SELECT to only rows not checked out
DROP POLICY IF EXISTS "Anon can read attendance for checkout" ON public.worker_attendance;
CREATE POLICY "Anon can read attendance for checkout"
  ON public.worker_attendance
  FOR SELECT
  TO anon
  USING (check_out IS NULL);

-- Restrict anon INSERT to require qr_token
DROP POLICY IF EXISTS "Anon can insert attendance" ON public.worker_attendance;
CREATE POLICY "Anon can insert attendance"
  ON public.worker_attendance
  FOR INSERT
  TO anon
  WITH CHECK (qr_token IS NOT NULL AND qr_token != '');

-- Restrict anon UPDATE  
DROP POLICY IF EXISTS "Anon can update for checkout" ON public.worker_attendance;
CREATE POLICY "Anon can update for checkout"
  ON public.worker_attendance
  FOR UPDATE
  TO anon
  USING (check_out IS NULL)
  WITH CHECK (check_out IS NOT NULL);

-- 2. Fix project_hakedis: restrict anon UPDATE to only approval columns via function
CREATE OR REPLACE FUNCTION public.update_hakedis_approval(
  _token text,
  _approval_status text,
  _client_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.project_hakedis
  SET 
    approval_status = _approval_status,
    client_note = _client_note,
    approved_at = CASE WHEN _approval_status = 'onaylandi' THEN now() ELSE approved_at END
  WHERE approval_token = _token
    AND approval_token IS NOT NULL;
  
  RETURN FOUND;
END;
$$;

-- Drop the overly permissive anon UPDATE policy
DROP POLICY IF EXISTS "Public can update approval status" ON public.project_hakedis;

-- Replace anon SELECT with token-restricted policy
DROP POLICY IF EXISTS "Public can read hakedis by token" ON public.project_hakedis;
CREATE POLICY "Public can read hakedis by token"
  ON public.project_hakedis
  FOR SELECT
  TO anon
  USING (approval_token IS NOT NULL);

-- 3. Fix office_teams: fix the broken self-referencing join
DROP POLICY IF EXISTS "Team members can view their team" ON public.office_teams;
CREATE POLICY "Team members can view their team"
  ON public.office_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.office_members
      WHERE office_members.team_id = office_teams.id
        AND office_members.user_id = auth.uid()
    )
  );
