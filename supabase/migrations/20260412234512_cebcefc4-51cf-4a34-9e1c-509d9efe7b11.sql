-- Create contract_items table for work items / BOQ
CREATE TABLE public.contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  poz_no TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'adet',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own or team contract items"
  ON public.contract_items FOR SELECT TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can insert own contract items"
  ON public.contract_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own or team contract items"
  ON public.contract_items FOR UPDATE TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can delete own contract items"
  ON public.contract_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Index for fast lookup by contract
CREATE INDEX idx_contract_items_contract_id ON public.contract_items(contract_id);

-- Trigger for updated_at
CREATE TRIGGER update_contract_items_updated_at
  BEFORE UPDATE ON public.contract_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();