
-- QR codes for projects
CREATE TABLE public.project_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, token)
);

ALTER TABLE public.project_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own qr codes" ON public.project_qr_codes
  FOR ALL TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon can validate token" ON public.project_qr_codes
  FOR SELECT TO anon
  USING (true);

-- Worker attendance records
CREATE TABLE public.worker_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  qr_token text NOT NULL,
  full_name text NOT NULL,
  tc_no text,
  phone text,
  occupation text NOT NULL DEFAULT 'Diğer',
  check_in timestamp with time zone NOT NULL DEFAULT now(),
  check_out timestamp with time zone,
  duration_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view attendance" ON public.worker_attendance
  FOR SELECT TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Owner can update attendance" ON public.worker_attendance
  FOR UPDATE TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Owner can delete attendance" ON public.worker_attendance
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anon can insert attendance" ON public.worker_attendance
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read attendance for checkout" ON public.worker_attendance
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can update for checkout" ON public.worker_attendance
  FOR UPDATE TO anon
  USING (check_out IS NULL)
  WITH CHECK (true);

CREATE INDEX idx_worker_attendance_project ON public.worker_attendance(project_id);
CREATE INDEX idx_worker_attendance_checkin ON public.worker_attendance(check_in);
CREATE INDEX idx_qr_codes_token ON public.project_qr_codes(token);
