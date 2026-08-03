-- 1) Server-side pagination read model -------------------------------------
CREATE OR REPLACE VIEW public.inventory_transfers_list
WITH (security_invoker = true) AS
SELECT
  t.*,
  m.name AS material_name,
  ws.name AS source_warehouse_name,
  wd.name AS dest_warehouse_name,
  lower(
    coalesce(t.transfer_no, '') || ' ' ||
    coalesce(m.name, '') || ' ' ||
    coalesce(ws.name, '') || ' ' ||
    coalesce(wd.name, '')
  ) AS search_text,
  (t.damaged_quantity + t.missing_quantity + t.rejected_quantity) AS discrepancy_quantity,
  CASE
    WHEN t.status IN ('received', 'rejected', 'cancelled') THEN NULL
    WHEN t.required_date IS NOT NULL
      THEN (t.required_date::timestamptz + interval '1 day' - interval '1 second')
    ELSE t.expected_arrival_at
  END AS overdue_reference_at
FROM public.inventory_transfers t
LEFT JOIN public.materials m ON m.id = t.material_id
LEFT JOIN public.warehouses ws ON ws.id = t.source_warehouse_id
LEFT JOIN public.warehouses wd ON wd.id = t.dest_warehouse_id;

GRANT SELECT ON public.inventory_transfers_list TO authenticated;

-- Deterministic keyset / offset ordering support
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_created_id
  ON public.inventory_transfers (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_required
  ON public.inventory_transfers (required_date, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_qty
  ON public.inventory_transfers (requested_quantity DESC, created_at DESC, id DESC);

-- 2) Document registration hardening ---------------------------------------
CREATE OR REPLACE FUNCTION public.register_transfer_document(
  _transfer_id uuid,
  _file_path text,
  _file_name text,
  _mime_type text,
  _file_size bigint,
  _doc_type text DEFAULT 'other'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _t public.inventory_transfers;
  _id uuid;
  _prefix text;
  _name text;
  _ext text;
  _dup uuid;
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

  IF _mime_type NOT IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') THEN
    RAISE EXCEPTION 'Desteklenmeyen dosya türü: yalnızca PDF, JPG, PNG ve WEBP yüklenebilir.';
  END IF;
  IF _file_size IS NULL OR _file_size <= 0 OR _file_size > 20971520 THEN
    RAISE EXCEPTION 'Dosya boyutu geçersiz: en fazla 20 MB yüklenebilir.';
  END IF;
  IF _doc_type NOT IN ('dispatch_note', 'receipt_note', 'photo', 'other') THEN
    RAISE EXCEPTION 'Geçersiz belge türü.';
  END IF;

  _name := btrim(coalesce(_file_name, ''));
  IF length(_name) = 0 OR length(_name) > 200 THEN
    RAISE EXCEPTION 'Dosya adı geçersiz.';
  END IF;
  IF _name ~ '[\x00-\x1f/\\]' THEN
    RAISE EXCEPTION 'Dosya adı geçersiz karakter içeriyor.';
  END IF;

  -- extension must match the declared mime type
  _ext := lower(coalesce(regexp_replace(_name, '^.*\.([A-Za-z0-9]+)$', '\1'), ''));
  IF _ext = lower(_name) THEN
    RAISE EXCEPTION 'Dosya uzantısı bulunamadı.';
  END IF;
  IF NOT (
       (_mime_type = 'application/pdf' AND _ext = 'pdf')
    OR (_mime_type = 'image/jpeg' AND _ext IN ('jpg', 'jpeg'))
    OR (_mime_type = 'image/png' AND _ext = 'png')
    OR (_mime_type = 'image/webp' AND _ext = 'webp')
  ) THEN
    RAISE EXCEPTION 'Dosya uzantısı dosya türü ile uyuşmuyor.';
  END IF;

  -- normalize + validate storage path
  IF _file_path IS NULL THEN
    RAISE EXCEPTION 'Dosya yolu geçersiz.';
  END IF;
  IF _file_path ~ '[\x00-\x1f]' OR _file_path LIKE '%\\%' OR _file_path LIKE '//%'
     OR _file_path LIKE '%//%' OR _file_path LIKE '/%' OR _file_path LIKE '%..%'
     OR length(_file_path) > 400 THEN
    RAISE EXCEPTION 'Dosya yolu geçersiz.';
  END IF;
  _prefix := _t.user_id::text || '/' || _transfer_id::text || '/';
  IF position(_prefix in _file_path) <> 1 OR length(_file_path) <= length(_prefix) THEN
    RAISE EXCEPTION 'Dosya yolu bu transfere ait değil.';
  END IF;

  -- reject duplicate active registration for the same logical document
  SELECT id INTO _dup
    FROM public.inventory_transfer_documents
   WHERE transfer_id = _transfer_id
     AND deleted_at IS NULL
     AND lower(file_name) = lower(_name)
     AND file_size = _file_size
     AND doc_type = _doc_type
   LIMIT 1;
  IF _dup IS NOT NULL THEN
    RAISE EXCEPTION 'Bu belge zaten yüklenmiş: aynı ad, tür ve boyutta aktif bir kayıt var.';
  END IF;

  INSERT INTO public.inventory_transfer_documents
    (user_id, transfer_id, doc_type, file_name, file_path, mime_type, file_size, uploaded_by)
  VALUES (_t.user_id, _transfer_id, _doc_type, _name, _file_path, _mime_type, _file_size, auth.uid())
  RETURNING id INTO _id;

  PERFORM public.inv_transfer_event(
    _t.user_id, _transfer_id, _t.status, 'document_uploaded',
    _name,
    jsonb_build_object('document_id', _id, 'doc_type', _doc_type,
                       'file_name', _name, 'file_size', _file_size,
                       'mime_type', _mime_type)
  );

  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_transfer_document(
  _document_id uuid,
  _reason text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_transfers t
     WHERE t.id = _d.transfer_id
       AND public.can_access_team_resource(auth.uid(), t.user_id)
  ) THEN
    RAISE EXCEPTION 'Bu transfere erişim yetkiniz yok.';
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
$function$;

REVOKE ALL ON FUNCTION public.register_transfer_document(uuid, text, text, text, bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_transfer_document(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_transfer_document(uuid, text, text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transfer_document(uuid, text) TO authenticated;