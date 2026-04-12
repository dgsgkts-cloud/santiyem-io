-- Add contract integration fields to hakedis_items
ALTER TABLE public.hakedis_items
  ADD COLUMN IF NOT EXISTS contract_item_id UUID REFERENCES public.contract_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS poz_no TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS previous_cumulative_qty NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_qty NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_qty NUMERIC NOT NULL DEFAULT 0;

-- Add contract linkage and totals to project_hakedis
ALTER TABLE public.project_hakedis
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gross_total NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deductions_total NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_total NUMERIC NOT NULL DEFAULT 0;

-- Create hakedis_deductions table
CREATE TABLE public.hakedis_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hakedis_id UUID NOT NULL REFERENCES public.project_hakedis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  deduction_type TEXT NOT NULL DEFAULT 'diger',
  label TEXT NOT NULL DEFAULT '',
  rate NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hakedis_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team deductions"
  ON public.hakedis_deductions FOR SELECT TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can insert own deductions"
  ON public.hakedis_deductions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deductions"
  ON public.hakedis_deductions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own deductions"
  ON public.hakedis_deductions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_hakedis_deductions_hakedis_id ON public.hakedis_deductions(hakedis_id);
CREATE INDEX idx_hakedis_items_contract_item_id ON public.hakedis_items(contract_item_id);