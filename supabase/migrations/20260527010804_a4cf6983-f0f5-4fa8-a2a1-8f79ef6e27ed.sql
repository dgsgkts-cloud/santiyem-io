-- 1) Replace worker_check_in: accept phone, dedupe by (project, name, phone, today)
CREATE OR REPLACE FUNCTION public.worker_check_in(
  _token text,
  _entry_type text,
  _full_name text,
  _title text,
  _occupation text,
  _foreman_name text,
  _team_size integer,
  _phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  qr RECORD;
  recent_count integer;
  new_id uuid;
  existing RECORD;
  norm_name text;
  norm_phone text;
  duration_min integer;
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

  norm_name := trim(_full_name);
  norm_phone := NULLIF(regexp_replace(coalesce(_phone, ''), '\s+', '', 'g'), '');

  -- Dedupe individual entries by (project, name, phone, today)
  IF _entry_type = 'individual' THEN
    SELECT *
    INTO existing
    FROM public.worker_attendance w
    WHERE w.project_id = qr.project_id
      AND w.entry_type = 'individual'
      AND lower(w.full_name) = lower(norm_name)
      AND coalesce(regexp_replace(coalesce(w.phone, ''), '\s+', '', 'g'), '') = coalesce(norm_phone, '')
      AND w.check_in >= date_trunc('day', now())
      AND w.check_in <  date_trunc('day', now()) + interval '1 day'
    ORDER BY w.check_in DESC
    LIMIT 1;

    IF existing.id IS NOT NULL THEN
      IF existing.check_out IS NULL THEN
        duration_min := GREATEST(0, EXTRACT(EPOCH FROM (now() - existing.check_in))::integer / 60);
        UPDATE public.worker_attendance
        SET check_out = now(), duration_minutes = duration_min,
            phone = COALESCE(norm_phone, phone)
        WHERE id = existing.id;
      END IF;
      RETURN existing.id;
    END IF;
  END IF;

  -- 5-min rate limit for new entries
  IF _entry_type = 'individual' THEN
    SELECT count(*) INTO recent_count
    FROM public.worker_attendance
    WHERE project_id = qr.project_id
      AND full_name = norm_name
      AND entry_type = 'individual'
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
     foreman_name, entry_type, team_size, phone)
  VALUES (
    qr.project_id, qr.user_id, _token,
    norm_name,
    NULLIF(trim(coalesce(_title,'')), ''),
    coalesce(NULLIF(trim(coalesce(_occupation,'')), ''), trim(coalesce(_title,''))),
    NULLIF(trim(coalesce(_foreman_name,'')), ''),
    _entry_type,
    coalesce(_team_size, 1),
    norm_phone
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

-- 2) Public range query for read-only client team-tracking
CREATE OR REPLACE FUNCTION public.list_attendance_by_qr_range(
  _token text,
  _from_date date,
  _to_date date
)
RETURNS TABLE(
  id uuid,
  project_id text,
  project_name text,
  full_name text,
  phone text,
  occupation text,
  title text,
  foreman_name text,
  entry_type text,
  team_size integer,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  duration_minutes integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  qr RECORD;
  d_from date;
  d_to date;
BEGIN
  SELECT q.project_id::text AS pid, p.name AS pname
  INTO qr
  FROM public.project_qr_codes q
  LEFT JOIN public.projects p ON p.id = q.project_id
  WHERE q.token = _token AND q.expires_at > now()
  LIMIT 1;

  IF qr.pid IS NULL THEN
    RETURN;
  END IF;

  d_from := COALESCE(_from_date, CURRENT_DATE);
  d_to   := COALESCE(_to_date,   CURRENT_DATE);

  RETURN QUERY
  SELECT w.id, w.project_id::text, qr.pname,
         w.full_name, w.phone, w.occupation, w.title,
         w.foreman_name, w.entry_type, w.team_size,
         w.check_in, w.check_out, w.duration_minutes
  FROM public.worker_attendance w
  WHERE w.project_id::text = qr.pid
    AND w.check_in >= d_from::timestamp
    AND w.check_in <  (d_to + 1)::timestamp
  ORDER BY w.check_in DESC;
END;
$function$;