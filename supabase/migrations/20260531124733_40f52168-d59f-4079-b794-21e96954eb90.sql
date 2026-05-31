
-- ENUMS
CREATE TYPE public.employment_type AS ENUM ('daily_wage','monthly_salary','subcontractor_crew');
CREATE TYPE public.attendance_status AS ENUM ('full_day','half_day','absent','leave');
CREATE TYPE public.attendance_source AS ENUM ('manual','qr');

-- PHONE NORMALIZATION HELPER
CREATE OR REPLACE FUNCTION public.normalize_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(coalesce(_p,''), '\D', '', 'g'), '')
$$;

-- 1) personnel (merkezi liste)
CREATE TABLE public.personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  phone_normalized text GENERATED ALWAYS AS (public.normalize_phone(phone)) STORED,
  occupation text,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  employment_type public.employment_type NOT NULL DEFAULT 'daily_wage',
  daily_wage numeric(12,2) DEFAULT 0,
  monthly_salary numeric(12,2) DEFAULT 0,
  subcontractor_id uuid REFERENCES public.subcontractors(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX personnel_user_phone_uniq
  ON public.personnel(user_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL;
CREATE INDEX personnel_user_idx ON public.personnel(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personnel TO authenticated;
GRANT ALL ON public.personnel TO service_role;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personnel select team" ON public.personnel
  FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "personnel insert own" ON public.personnel
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "personnel update team" ON public.personnel
  FOR UPDATE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "personnel delete own" ON public.personnel
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_personnel_updated
  BEFORE UPDATE ON public.personnel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) personnel_project_assignments
CREATE TABLE public.personnel_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  salary_share_percent numeric(5,2),
  salary_share_amount numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(personnel_id, project_id)
);
CREATE INDEX ppa_user_idx ON public.personnel_project_assignments(user_id);
CREATE INDEX ppa_project_idx ON public.personnel_project_assignments(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personnel_project_assignments TO authenticated;
GRANT ALL ON public.personnel_project_assignments TO service_role;
ALTER TABLE public.personnel_project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppa select" ON public.personnel_project_assignments
  FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id) OR public.can_access_project(auth.uid(), project_id));
CREATE POLICY "ppa insert" ON public.personnel_project_assignments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ppa update" ON public.personnel_project_assignments
  FOR UPDATE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "ppa delete" ON public.personnel_project_assignments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_ppa_updated
  BEFORE UPDATE ON public.personnel_project_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) attendance_records
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  work_date date NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'full_day',
  source public.attendance_source NOT NULL DEFAULT 'manual',
  qr_attendance_id uuid REFERENCES public.worker_attendance(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(personnel_id, project_id, work_date)
);
CREATE INDEX ar_user_idx ON public.attendance_records(user_id);
CREATE INDEX ar_proj_month_idx ON public.attendance_records(project_id, work_date);
CREATE INDEX ar_personnel_idx ON public.attendance_records(personnel_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id) OR public.can_access_project(auth.uid(), project_id));
CREATE POLICY "ar insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ar update" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "ar delete" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_ar_updated
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) QR auto-match trigger: worker_attendance INSERT -> attendance_records
CREATE OR REPLACE FUNCTION public.match_qr_checkin_to_personnel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_personnel uuid;
  norm text;
  proj_uuid uuid;
BEGIN
  norm := public.normalize_phone(NEW.phone);
  IF norm IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO matched_personnel
  FROM public.personnel
  WHERE user_id = NEW.user_id
    AND phone_normalized = norm
    AND is_active = true
  LIMIT 1;

  IF matched_personnel IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    proj_uuid := NEW.project_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  INSERT INTO public.attendance_records
    (user_id, personnel_id, project_id, work_date, status, source, qr_attendance_id)
  VALUES
    (NEW.user_id, matched_personnel, proj_uuid, NEW.check_in::date, 'full_day', 'qr', NEW.id)
  ON CONFLICT (personnel_id, project_id, work_date)
  DO UPDATE SET
    source = CASE WHEN public.attendance_records.source = 'manual'
                  THEN public.attendance_records.source ELSE 'qr' END,
    qr_attendance_id = COALESCE(public.attendance_records.qr_attendance_id, EXCLUDED.qr_attendance_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_worker_attendance_match_personnel ON public.worker_attendance;
CREATE TRIGGER trg_worker_attendance_match_personnel
  AFTER INSERT ON public.worker_attendance
  FOR EACH ROW EXECUTE FUNCTION public.match_qr_checkin_to_personnel();

-- 5) Unmatched QR checkins view
CREATE OR REPLACE VIEW public.unmatched_qr_checkins
WITH (security_invoker = true) AS
SELECT
  w.id AS worker_attendance_id,
  w.user_id,
  w.project_id,
  w.full_name,
  w.phone,
  w.occupation,
  w.title,
  w.check_in,
  w.entry_type
FROM public.worker_attendance w
WHERE w.phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.personnel p
    WHERE p.user_id = w.user_id
      AND p.phone_normalized = public.normalize_phone(w.phone)
  );

GRANT SELECT ON public.unmatched_qr_checkins TO authenticated;

-- 6) Bulk upsert RPC
CREATE OR REPLACE FUNCTION public.bulk_upsert_attendance(_records jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec jsonb;
  cnt integer := 0;
  pers_user uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(_records)
  LOOP
    SELECT user_id INTO pers_user FROM public.personnel
      WHERE id = (rec->>'personnel_id')::uuid;
    IF pers_user IS NULL THEN CONTINUE; END IF;
    IF NOT public.can_access_team_resource(uid, pers_user) THEN CONTINUE; END IF;

    INSERT INTO public.attendance_records
      (user_id, personnel_id, project_id, work_date, status, source)
    VALUES
      (pers_user,
       (rec->>'personnel_id')::uuid,
       (rec->>'project_id')::uuid,
       (rec->>'work_date')::date,
       (rec->>'status')::public.attendance_status,
       'manual')
    ON CONFLICT (personnel_id, project_id, work_date)
    DO UPDATE SET status = EXCLUDED.status, source = 'manual', updated_at = now();
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

-- 7) Compute project labor cost for a given month
CREATE OR REPLACE FUNCTION public.compute_project_labor_cost(_project uuid, _month date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_cost numeric := 0;
  monthly_cost numeric := 0;
  daily_count integer := 0;
  monthly_count integer := 0;
  crew_count integer := 0;
  crew_days integer := 0;
  m_start date := date_trunc('month', _month)::date;
  m_end   date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
BEGIN
  -- Daily wage: sum (full=1, half=0.5) * daily_wage
  SELECT COALESCE(SUM(
    CASE ar.status WHEN 'full_day' THEN 1.0 WHEN 'half_day' THEN 0.5 ELSE 0 END
    * COALESCE(p.daily_wage, 0)
  ), 0),
  COUNT(DISTINCT p.id) FILTER (WHERE p.employment_type = 'daily_wage')
  INTO daily_cost, daily_count
  FROM public.attendance_records ar
  JOIN public.personnel p ON p.id = ar.personnel_id
  WHERE ar.project_id = _project
    AND ar.work_date BETWEEN m_start AND m_end
    AND p.employment_type = 'daily_wage';

  -- Monthly salary: assignments × share
  SELECT COALESCE(SUM(
    CASE
      WHEN ppa.salary_share_amount IS NOT NULL THEN ppa.salary_share_amount
      WHEN ppa.salary_share_percent IS NOT NULL THEN COALESCE(p.monthly_salary,0) * ppa.salary_share_percent / 100.0
      ELSE COALESCE(p.monthly_salary,0)
    END
  ), 0),
  COUNT(*)
  INTO monthly_cost, monthly_count
  FROM public.personnel_project_assignments ppa
  JOIN public.personnel p ON p.id = ppa.personnel_id
  WHERE ppa.project_id = _project
    AND ppa.is_active = true
    AND p.employment_type = 'monthly_salary'
    AND p.is_active = true;

  -- Subcontractor crew (info only)
  SELECT COUNT(DISTINCT p.id),
         COALESCE(SUM(CASE ar.status WHEN 'full_day' THEN 1 WHEN 'half_day' THEN 1 ELSE 0 END), 0)
  INTO crew_count, crew_days
  FROM public.personnel p
  LEFT JOIN public.attendance_records ar
    ON ar.personnel_id = p.id
   AND ar.project_id = _project
   AND ar.work_date BETWEEN m_start AND m_end
  WHERE p.employment_type = 'subcontractor_crew'
    AND EXISTS (
      SELECT 1 FROM public.personnel_project_assignments x
      WHERE x.personnel_id = p.id AND x.project_id = _project AND x.is_active = true
    );

  RETURN jsonb_build_object(
    'month', m_start,
    'daily_wage_cost', daily_cost,
    'monthly_salary_cost', monthly_cost,
    'total_cost', daily_cost + monthly_cost,
    'daily_wage_count', daily_count,
    'monthly_salary_count', monthly_count,
    'subcontractor_crew_count', crew_count,
    'subcontractor_crew_days', crew_days
  );
END;
$$;
