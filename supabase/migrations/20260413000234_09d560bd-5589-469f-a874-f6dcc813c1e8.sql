
-- Subcontractors table
CREATE TABLE public.subcontractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT NULL,
  specialty TEXT DEFAULT NULL,
  project_id TEXT DEFAULT NULL,
  contract_amount NUMERIC NOT NULL DEFAULT 0,
  payment_schedule JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team subcontractors" ON public.subcontractors FOR SELECT TO authenticated USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can insert own subcontractors" ON public.subcontractors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own or team subcontractors" ON public.subcontractors FOR UPDATE TO authenticated USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can delete own subcontractors" ON public.subcontractors FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_subcontractors_updated_at BEFORE UPDATE ON public.subcontractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subcontractor payments table
CREATE TABLE public.subcontractor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  planned_date DATE DEFAULT NULL,
  description TEXT DEFAULT NULL,
  receipt_url TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'odendi',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subcontractor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team sub payments" ON public.subcontractor_payments FOR SELECT TO authenticated USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can insert own sub payments" ON public.subcontractor_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own or team sub payments" ON public.subcontractor_payments FOR UPDATE TO authenticated USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can delete own sub payments" ON public.subcontractor_payments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_sub_payments_updated_at BEFORE UPDATE ON public.subcontractor_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
