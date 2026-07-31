-- 1. hakedis_deductions: UPDATE had no WITH CHECK, so an owner could rewrite user_id
DROP POLICY IF EXISTS "Users can update own deductions" ON public.hakedis_deductions;
CREATE POLICY "Users can update own deductions"
ON public.hakedis_deductions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. contract_activity_log: append-only, restricted to the contract owner
DROP POLICY IF EXISTS "Owner can view activity" ON public.contract_activity_log;
CREATE POLICY "Owner can view activity"
ON public.contract_activity_log
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contracts c
  WHERE c.id = contract_activity_log.contract_id AND c.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Owner can insert activity" ON public.contract_activity_log;
CREATE POLICY "Owner can insert activity"
ON public.contract_activity_log
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.contracts c
  WHERE c.id = contract_activity_log.contract_id AND c.user_id = auth.uid()
));

-- explicit deny for tampering with the audit trail
DROP POLICY IF EXISTS "Activity log is append only (no update)" ON public.contract_activity_log;
CREATE POLICY "Activity log is append only (no update)"
ON public.contract_activity_log
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Activity log is append only (no delete)" ON public.contract_activity_log;
CREATE POLICY "Activity log is append only (no delete)"
ON public.contract_activity_log
FOR DELETE
TO authenticated
USING (false);

REVOKE UPDATE, DELETE ON public.contract_activity_log FROM authenticated;
GRANT SELECT, INSERT ON public.contract_activity_log TO authenticated;
GRANT ALL ON public.contract_activity_log TO service_role;

-- 3. contract_signed_uploads: writes were undefined; keep inserts on the trusted RPC only,
-- but let the contract owner clean up stale uploads with an explicit ownership check.
DROP POLICY IF EXISTS "Owner can view uploads" ON public.contract_signed_uploads;
CREATE POLICY "Owner can view uploads"
ON public.contract_signed_uploads
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contract_signature_requests csr
  WHERE csr.id = contract_signed_uploads.signature_request_id AND csr.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Owner can delete uploads" ON public.contract_signed_uploads;
CREATE POLICY "Owner can delete uploads"
ON public.contract_signed_uploads
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contract_signature_requests csr
  WHERE csr.id = contract_signed_uploads.signature_request_id AND csr.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Signed uploads are immutable" ON public.contract_signed_uploads;
CREATE POLICY "Signed uploads are immutable"
ON public.contract_signed_uploads
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

REVOKE INSERT, UPDATE ON public.contract_signed_uploads FROM authenticated, anon;
GRANT SELECT, DELETE ON public.contract_signed_uploads TO authenticated;
GRANT ALL ON public.contract_signed_uploads TO service_role;