
ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS project_ids text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.subcontractor_payments
  ADD COLUMN IF NOT EXISTS project_id text,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'nakit',
  ADD COLUMN IF NOT EXISTS check_no text,
  ADD COLUMN IF NOT EXISTS check_due_date date,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_no text,
  ADD COLUMN IF NOT EXISTS note text;
