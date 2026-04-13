
ALTER TABLE public.worker_attendance
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS foreman_name text;
