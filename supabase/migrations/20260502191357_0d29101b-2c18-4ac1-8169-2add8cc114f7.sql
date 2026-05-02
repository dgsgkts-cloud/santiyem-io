
-- ============================================================
-- 1. CONTRACT SIGNATURE REQUESTS — drop public read, add RPC
-- ============================================================
DROP POLICY IF EXISTS "Public can read by token" ON public.contract_signature_requests;

CREATE OR REPLACE FUNCTION public.get_signature_request_by_token(_token text)
RETURNS TABLE (
  id uuid,
  contract_id uuid,
  recipient_name text,
  recipient_email text,
  message text,
  status text,
  sent_at timestamptz,
  signed_at timestamptz,
  deadline date,
  contract_name text,
  contract_counterparty text,
  contract_file_url text,
  contract_file_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    csr.id,
    csr.contract_id,
    csr.recipient_name,
    csr.recipient_email,
    csr.message,
    csr.status,
    csr.sent_at,
    csr.signed_at,
    csr.deadline,
    c.name,
    c.counterparty,
    c.file_url,
    c.file_name
  FROM public.contract_signature_requests csr
  LEFT JOIN public.contracts c ON c.id = csr.contract_id
  WHERE csr.token = _token
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_signature_request_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signature_request_by_token(text) TO anon, authenticated;

-- ============================================================
-- 2. CONTRACT SIGNED UPLOADS — drop public read, add RPC
-- ============================================================
DROP POLICY IF EXISTS "Public can view own uploads" ON public.contract_signed_uploads;
DROP POLICY IF EXISTS "Public can insert uploads" ON public.contract_signed_uploads;

-- List uploads only via token RPC for public signers, owner can SELECT directly
CREATE OR REPLACE FUNCTION public.list_signed_uploads_by_token(_token text)
RETURNS TABLE (
  id uuid,
  signature_request_id uuid,
  signer_name text,
  signer_title text,
  file_url text,
  file_name text,
  file_size bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.signature_request_id, u.signer_name, u.signer_title,
         u.file_url, u.file_name, u.file_size, u.created_at
  FROM public.contract_signed_uploads u
  JOIN public.contract_signature_requests csr ON csr.id = u.signature_request_id
  WHERE csr.token = _token
  ORDER BY u.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.list_signed_uploads_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_signed_uploads_by_token(text) TO anon, authenticated;

-- Public submit RPC — validates token, writes upload + activity + updates request
CREATE OR REPLACE FUNCTION public.record_signed_upload(
  _token text,
  _signer_name text,
  _signer_title text,
  _file_url text,
  _file_name text,
  _file_size bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  upload_id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;
  IF _signer_name IS NULL OR length(trim(_signer_name)) = 0 THEN
    RAISE EXCEPTION 'Signer name required';
  END IF;
  IF _file_url IS NULL OR _file_name IS NULL THEN
    RAISE EXCEPTION 'File required';
  END IF;

  SELECT id, contract_id, recipient_email, deadline, sent_at
  INTO req
  FROM public.contract_signature_requests
  WHERE token = _token
  LIMIT 1;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Signature request not found';
  END IF;

  -- Expiry check
  IF req.deadline IS NOT NULL AND now()::date > req.deadline THEN
    RAISE EXCEPTION 'Signature request expired';
  END IF;
  IF req.deadline IS NULL AND req.sent_at IS NOT NULL
     AND now() > req.sent_at + interval '30 days' THEN
    RAISE EXCEPTION 'Signature request expired';
  END IF;

  INSERT INTO public.contract_signed_uploads
    (signature_request_id, signer_name, signer_title, file_url, file_name, file_size)
  VALUES
    (req.id, trim(_signer_name), NULLIF(trim(coalesce(_signer_title,'')), ''),
     _file_url, _file_name, coalesce(_file_size, 0))
  RETURNING id INTO upload_id;

  UPDATE public.contract_signature_requests
  SET status = 'imzalandi', signed_at = now()
  WHERE id = req.id;

  INSERT INTO public.contract_activity_log
    (contract_id, action, description, actor_name, actor_email)
  VALUES
    (req.contract_id, 'imzali_yuklendi',
     'İmzalı versiyon yüklendi — ' || trim(_signer_name)
       || CASE WHEN _signer_title IS NOT NULL AND length(trim(_signer_title))>0
                THEN ' (' || trim(_signer_title) || ')' ELSE '' END,
     trim(_signer_name), req.recipient_email);

  RETURN upload_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_signed_upload(text,text,text,text,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_signed_upload(text,text,text,text,text,bigint) TO anon, authenticated;

-- ============================================================
-- 3. PROJECT HAKEDIS — drop public read, add RPC
-- ============================================================
DROP POLICY IF EXISTS "Public can read hakedis by token" ON public.project_hakedis;

CREATE OR REPLACE FUNCTION public.get_hakedis_by_approval_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h RECORD;
  result jsonb;
BEGIN
  SELECT * INTO h
  FROM public.project_hakedis
  WHERE approval_token = _token
  LIMIT 1;

  IF h.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'hakedis', to_jsonb(h),
    'project', (
      SELECT jsonb_build_object('name', p.name, 'client', p.client, 'location', p.location)
      FROM public.projects p WHERE p.id = h.project_id
    ),
    'items', (
      SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.sort_order), '[]'::jsonb)
      FROM public.hakedis_items i WHERE i.hakedis_id = h.id
    ),
    'deductions', (
      SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.sort_order), '[]'::jsonb)
      FROM public.hakedis_deductions d WHERE d.hakedis_id = h.id
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hakedis_by_approval_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hakedis_by_approval_token(text) TO anon, authenticated;

-- ============================================================
-- 4. PROJECT QR CODES — drop anon SELECT, add RPC
-- ============================================================
DROP POLICY IF EXISTS "Anon can validate token" ON public.project_qr_codes;

CREATE OR REPLACE FUNCTION public.validate_qr_token(_token text)
RETURNS TABLE (
  project_id text,
  user_id uuid,
  project_name text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.project_id::text, q.user_id, p.name, q.expires_at
  FROM public.project_qr_codes q
  LEFT JOIN public.projects p ON p.id = q.project_id
  WHERE q.token = _token AND q.expires_at > now()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.validate_qr_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_qr_token(text) TO anon, authenticated;

-- ============================================================
-- 5. WORKER ATTENDANCE — drop anon SELECT/UPDATE, add RPCs
-- ============================================================
DROP POLICY IF EXISTS "Anon can read attendance for checkout" ON public.worker_attendance;
DROP POLICY IF EXISTS "Anon can update for checkout" ON public.worker_attendance;
DROP POLICY IF EXISTS "Anon can insert attendance" ON public.worker_attendance;

-- List today's workers — strips PII
CREATE OR REPLACE FUNCTION public.list_today_workers_by_qr(_token text)
RETURNS TABLE (
  id uuid,
  project_id text,
  full_name text,
  occupation text,
  title text,
  foreman_name text,
  entry_type text,
  team_size integer,
  check_in timestamptz,
  check_out timestamptz,
  duration_minutes integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qr RECORD;
BEGIN
  SELECT q.project_id::text AS pid INTO qr
  FROM public.project_qr_codes q
  WHERE q.token = _token AND q.expires_at > now()
  LIMIT 1;

  IF qr.pid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT w.id, w.project_id::text, w.full_name, w.occupation, w.title,
         w.foreman_name, w.entry_type, w.team_size,
         w.check_in, w.check_out, w.duration_minutes
  FROM public.worker_attendance w
  WHERE w.project_id::text = qr.pid
    AND w.check_in >= date_trunc('day', now())
  ORDER BY w.check_in DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_today_workers_by_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_today_workers_by_qr(text) TO anon, authenticated;

-- Worker check-in (individual or team)
CREATE OR REPLACE FUNCTION public.worker_check_in(
  _token text,
  _entry_type text,
  _full_name text,
  _title text,
  _occupation text,
  _foreman_name text,
  _team_size integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qr RECORD;
  recent_count integer;
  new_id uuid;
BEGIN
  SELECT q.project_id, q.user_id
  INTO qr
  FROM public.project_qr_codes q
  WHERE q.token = _token AND q.expires_at > now()
  LIMIT 1;

  IF qr.project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired QR token';
  END IF;

  IF _entry_type NOT IN ('individual','team') THEN
    RAISE EXCEPTION 'Invalid entry type';
  END IF;

  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'Name required';
  END IF;

  -- 5-min rate limit
  IF _entry_type = 'individual' THEN
    SELECT count(*) INTO recent_count
    FROM public.worker_attendance
    WHERE project_id = qr.project_id
      AND full_name = trim(_full_name)
      AND entry_type = 'individual'
      AND check_out IS NULL
      AND check_in >= now() - interval '5 minutes';
  ELSE
    SELECT count(*) INTO recent_count
    FROM public.worker_attendance
    WHERE project_id = qr.project_id
      AND foreman_name = trim(coalesce(_foreman_name, _full_name))
      AND entry_type = 'team'
      AND check_out IS NULL
      AND check_in >= now() - interval '5 minutes';
  END IF;

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Rate limited';
  END IF;

  INSERT INTO public.worker_attendance
    (project_id, user_id, qr_token, full_name, title, occupation,
     foreman_name, entry_type, team_size)
  VALUES (
    qr.project_id, qr.user_id, _token,
    trim(_full_name),
    NULLIF(trim(coalesce(_title,'')), ''),
    coalesce(NULLIF(trim(coalesce(_occupation,'')), ''), trim(coalesce(_title,''))),
    NULLIF(trim(coalesce(_foreman_name,'')), ''),
    _entry_type,
    coalesce(_team_size, 1)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.worker_check_in(text,text,text,text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.worker_check_in(text,text,text,text,text,text,integer) TO anon, authenticated;

-- Worker checkout — must provide token (proves on-site) and attendance id
CREATE OR REPLACE FUNCTION public.worker_check_out(_token text, _attendance_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qr RECORD;
  rec RECORD;
  duration_min integer;
BEGIN
  SELECT q.project_id INTO qr
  FROM public.project_qr_codes q
  WHERE q.token = _token AND q.expires_at > now()
  LIMIT 1;

  IF qr.project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired QR token';
  END IF;

  SELECT id, project_id, check_in, check_out
  INTO rec
  FROM public.worker_attendance
  WHERE id = _attendance_id
  LIMIT 1;

  IF rec.id IS NULL OR rec.project_id <> qr.project_id THEN
    RAISE EXCEPTION 'Attendance not found';
  END IF;

  IF rec.check_out IS NOT NULL THEN
    RETURN false;
  END IF;

  duration_min := GREATEST(0, EXTRACT(EPOCH FROM (now() - rec.check_in))::integer / 60);

  UPDATE public.worker_attendance
  SET check_out = now(), duration_minutes = duration_min
  WHERE id = _attendance_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.worker_check_out(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.worker_check_out(text, uuid) TO anon, authenticated;

-- ============================================================
-- 6. Lock down internal SECURITY DEFINER helpers
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_diary_materials_to_expenses() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_pending_invitations(uuid, text) FROM PUBLIC, anon, authenticated;
