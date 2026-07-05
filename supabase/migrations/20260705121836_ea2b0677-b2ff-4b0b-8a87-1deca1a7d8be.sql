
-- 1) Revoke anon EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.accept_project_invitation(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_voice_usage_seconds(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_attendance(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_team_resource(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_feature(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_quota(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_project_labor_cost(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_org_plan_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_role(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_team_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_project_permission(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_usage(text, bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_manager_or_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_same_team(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_company_memories(uuid, vector, integer, double precision, public.memory_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(uuid, vector, text, integer, double precision, text, text, text, text[], date, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_qr_checkin_to_personnel() FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_project_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_org_plan(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_project_member_permission(uuid, uuid, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_project_member_role(uuid, uuid, public.project_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_diary_materials_to_stock() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_documents_used(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_memories_used(uuid[]) FROM anon;

-- 2) Tighten storage.objects SELECT policies on public buckets.
--    Public URLs still resolve (buckets remain public); only listing is restricted.
DROP POLICY IF EXISTS "Anyone can view diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view signed contracts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project files" ON storage.objects;

CREATE POLICY "Users can view own diary photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'site-diary-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners can view signed contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signed-contracts'
    AND EXISTS (
      SELECT 1
      FROM public.contract_signature_requests csr
      JOIN public.contracts c ON c.id = csr.contract_id
      WHERE csr.token = (storage.foldername(objects.name))[1]
        AND public.can_access_team_resource(auth.uid(), c.user_id)
    )
  );

CREATE POLICY "Token holders can view signed contracts"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'signed-contracts'
    AND EXISTS (
      SELECT 1 FROM public.contract_signature_requests csr
      WHERE csr.token = (storage.foldername(objects.name))[1]
        AND (csr.deadline IS NULL OR csr.deadline >= CURRENT_DATE)
        AND (csr.sent_at IS NULL OR csr.sent_at > now() - interval '30 days')
    )
  );
