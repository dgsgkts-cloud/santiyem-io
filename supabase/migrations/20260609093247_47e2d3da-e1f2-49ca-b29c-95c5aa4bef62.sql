
-- Replace signed-contracts INSERT policy to require a valid token in the path
DROP POLICY IF EXISTS "Signed contract uploads require valid request" ON storage.objects;

CREATE POLICY "Signed contract uploads require valid token"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'signed-contracts'
  AND EXISTS (
    SELECT 1 FROM public.contract_signature_requests csr
    WHERE csr.token = (storage.foldername(objects.name))[1]
      AND (csr.deadline IS NULL OR csr.deadline >= CURRENT_DATE)
      AND (csr.sent_at IS NULL OR csr.sent_at > now() - interval '30 days')
  )
);

-- Deny UPDATE / DELETE on signed-contracts for normal callers (service_role bypasses RLS)
DROP POLICY IF EXISTS "Signed contracts cannot be updated" ON storage.objects;
CREATE POLICY "Signed contracts cannot be updated"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'signed-contracts' AND false)
WITH CHECK (bucket_id = 'signed-contracts' AND false);

DROP POLICY IF EXISTS "Signed contracts cannot be deleted" ON storage.objects;
CREATE POLICY "Signed contracts cannot be deleted"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'signed-contracts' AND false);

-- Add owner-scoped UPDATE policy for project-files
DROP POLICY IF EXISTS "Users can update own project files" ON storage.objects;
CREATE POLICY "Users can update own project files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
