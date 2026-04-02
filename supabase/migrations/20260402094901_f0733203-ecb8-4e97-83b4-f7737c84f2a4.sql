
ALTER TABLE public.project_hakedis
ADD COLUMN IF NOT EXISTS expected_payment_date date,
ADD COLUMN IF NOT EXISTS reminder_days_before integer DEFAULT 3;
