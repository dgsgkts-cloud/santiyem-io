-- 1) Metadata table
CREATE TABLE public.inventory_transfer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transfer_id uuid NOT NULL REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_itd_transfer ON public.inventory_transfer_documents(transfer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_itd_user ON public.inventory_transfer_documents(user_id);

-- 2) Grants: read only for the app; all writes go through security definer RPCs
GRANT SELECT ON public.inventory_transfer_documents TO authenticated;
GRANT ALL ON public.inventory_transfer_documents TO service_role;

-- 3) RLS
ALTER TABLE public.inventory_transfer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view transfer documents"
  ON public.inventory_transfer_documents FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id) AND deleted_at IS NULL);

CREATE TRIGGER trg_itd_updated_at
  BEFORE UPDATE ON public.inventory_transfer_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Register (upload metadata) RPC
CREATE OR REPLACE FUNCTION public.register_transfer_document(
  _transfer_id uuid,
  _file_path text,
  _file_name text,
  _mime_type text,
  _file_size bigint,
  _doc_type text DEFAULT 'other'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t public.inventory_transfers;
  _id uuid;
  _prefix text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz istek: oturum bulunamadı.';
  END IF;

  SELECT * INTO _t FROM public.inventory_transfers WHERE id = _transfer_id;
  IF _t.id IS NULL THEN
    RAISE EXCEPTION 'Transfer kaydı bulunamadı.';
  END IF;
  IF NOT public.can_access_team_resource(auth.uid(), _t.user_id) THEN
    RAISE EXCEPTION 'Bu transfere belge ekleme yetkiniz yok.';
  END IF;

  IF _mime_type NOT IN ('application/pdf','image/jpeg','image/png','image/webp') THEN
    RAISE EXCEPTION 'Desteklenmeyen dosya türü: yalnızca PDF, JPG, PNG ve WEBP yüklenebilir.';
  END IF;
  IF _file_size IS NULL OR _file_size <= 0 OR _file_size > 20971520 THEN
    RAISE EXCEPTION 'Dosya boyutu geçersiz: en fazla 20 MB yüklenebilir.';
  END IF;
  IF _doc_type NOT IN ('dispatch_note','receipt_note','photo','other') THEN
    RAISE EXCEPTION 'Geçersiz belge türü.';
  END IF;
  IF _file_name IS NULL OR length(btrim(_file_name)) = 0 OR length(_file_name) > 200 THEN
    RAISE EXCEPTION 'Dosya adı geçersiz.';
  END IF;

  _prefix := _t.user_id::text || '/' || _transfer_id::text || '/';
  IF _file_path IS NULL OR position(_prefix in _file_path) <> 1 OR _file_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Dosya yolu bu transfere ait değil.';
  END IF;

  INSERT INTO public.inventory_transfer_documents
    (user_id, transfer_id, doc_type, file_name, file_path, mime_type, file_size, uploaded_by)
  VALUES (_t.user_id, _transfer_id, _doc_type, btrim(_file_name), _file_path, _mime_type, _file_size, auth.uid())
  RETURNING id INTO _id;

  PERFORM public.inv_transfer_event(
    _t.user_id, _transfer_id, _t.status, 'document_uploaded',
    btrim(_file_name),
    jsonb_build_object('document_id', _id, 'doc_type', _doc_type,
                       'file_name', btrim(_file_name), 'file_size', _file_size,
                       'mime_type', _mime_type)
  );

  RETURN _id;
END;
$$;

-- 5) Delete (archive) RPC
CREATE OR REPLACE FUNCTION public.delete_transfer_document(
  _document_id uuid,
  _reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d public.inventory_transfer_documents;
  _status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz istek: oturum bulunamadı.';
  END IF;

  SELECT * INTO _d FROM public.inventory_transfer_documents WHERE id = _document_id;
  IF _d.id IS NULL THEN
    RAISE EXCEPTION 'Belge kaydı bulunamadı.';
  END IF;
  IF NOT public.can_access_team_resource(auth.uid(), _d.user_id) THEN
    RAISE EXCEPTION 'Bu belgeyi silme yetkiniz yok.';
  END IF;
  IF _d.deleted_at IS NOT NULL THEN
    RETURN true;
  END IF;

  UPDATE public.inventory_transfer_documents
     SET deleted_at = now(), deleted_by = auth.uid()
   WHERE id = _document_id;

  SELECT status INTO _status FROM public.inventory_transfers WHERE id = _d.transfer_id;

  PERFORM public.inv_transfer_event(
    _d.user_id, _d.transfer_id, COALESCE(_status, 'requested'), 'document_deleted',
    COALESCE(NULLIF(btrim(_reason), ''), _d.file_name),
    jsonb_build_object('document_id', _d.id, 'file_name', _d.file_name, 'reason', _reason)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.register_transfer_document(uuid, text, text, text, bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_transfer_document(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_transfer_document(uuid, text, text, text, bigint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_transfer_document(uuid, text) TO authenticated, service_role;

-- 6) Storage policies for the private transfer-documents bucket
CREATE POLICY "Team can read transfer document files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'transfer-documents'
    AND public.can_access_team_resource(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Team can upload transfer document files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'transfer-documents'
    AND public.can_access_team_resource(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Team can delete transfer document files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'transfer-documents'
    AND public.can_access_team_resource(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
