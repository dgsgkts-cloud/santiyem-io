-- Add contract_amount to projects for tracking contract value
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_amount numeric DEFAULT 0;

-- Add payment_date to project_hakedis for tracking when payment was received
ALTER TABLE public.project_hakedis ADD COLUMN IF NOT EXISTS payment_date date;