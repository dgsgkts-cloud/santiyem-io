CREATE TABLE public.e_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('gelen','giden')),
  invoice_type text NOT NULL DEFAULT 'e_fatura' CHECK (invoice_type IN ('e_fatura','e_arsiv')),
  invoice_no text NOT NULL DEFAULT '',
  invoice_uuid text,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  counterparty_name text NOT NULL DEFAULT '',
  counterparty_tax_no text,
  description text,
  subtotal numeric NOT NULL DEFAULT 0,
  kdv_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  status text NOT NULL DEFAULT 'beklemede' CHECK (status IN ('beklemede','onaylandi','reddedildi','iade','iptal','odendi','tahsil_edildi')),
  source text NOT NULL DEFAULT 'manuel' CHECK (source IN ('manuel','ubl_upload','provider_api')),
  ubl_payload jsonb,
  file_url text,
  file_name text,
  project_id text,
  linked_payment_id uuid,
  linked_collection_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_e_invoices_user ON public.e_invoices(user_id);
CREATE INDEX idx_e_invoices_direction ON public.e_invoices(direction);
CREATE INDEX idx_e_invoices_status ON public.e_invoices(status);
CREATE INDEX idx_e_invoices_date ON public.e_invoices(invoice_date DESC);
CREATE UNIQUE INDEX idx_e_invoices_unique ON public.e_invoices(user_id, direction, invoice_no, counterparty_tax_no) WHERE invoice_no <> '';

ALTER TABLE public.e_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or team e-invoices" ON public.e_invoices
  FOR SELECT USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Insert own e-invoices" ON public.e_invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or team e-invoices" ON public.e_invoices
  FOR UPDATE USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Delete own e-invoices" ON public.e_invoices
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER e_invoices_updated
  BEFORE UPDATE ON public.e_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();