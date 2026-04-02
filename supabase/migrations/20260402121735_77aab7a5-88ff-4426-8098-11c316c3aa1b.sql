-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  counterparty TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  contract_type TEXT NOT NULL DEFAULT 'yapim_isleri',
  notes TEXT DEFAULT '',
  ai_analysis JSONB DEFAULT NULL,
  payment_schedule JSONB DEFAULT '[]'::jsonb,
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own or team contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can insert own contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own or team contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can delete own contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX idx_contracts_end_date ON public.contracts(end_date);