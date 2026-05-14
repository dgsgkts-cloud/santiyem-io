-- Add source tracking columns to cash_payments for safe dedup
ALTER TABLE public.cash_payments
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

-- Backfill from existing subcontractor markers in description
UPDATE public.cash_payments
SET source_type = 'subcontractor_payment',
    source_id = (regexp_match(description, '__sub_pay:([0-9a-f-]{36})'))[1]::uuid
WHERE source_id IS NULL
  AND description ~ '__sub_pay:[0-9a-f-]{36}';

-- Deduplicate any pre-existing duplicate mirrors, keep the oldest
DELETE FROM public.cash_payments cp
USING public.cash_payments cp2
WHERE cp.source_type = 'subcontractor_payment'
  AND cp.source_type = cp2.source_type
  AND cp.source_id = cp2.source_id
  AND cp.source_id IS NOT NULL
  AND cp.created_at > cp2.created_at;

-- Unique constraint to prevent future duplicates per source
CREATE UNIQUE INDEX IF NOT EXISTS cash_payments_source_unique
  ON public.cash_payments (source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cash_payments_source_idx
  ON public.cash_payments (source_type, source_id);