-- ============================================================
-- Purchase order chain: PR → RFQ → quotation → PO → payment plan
-- → payment (cash_payments) → delivery → goods receipt → stock
-- (material_entries) → supplier invoice → project cost.
-- ============================================================

CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_no text NOT NULL,
  -- chain links (kept as stable references to existing structures)
  purchase_request_id text,
  purchase_request_no text,
  rfq_no text,
  quotation_ref text,
  quotation_total numeric,
  supplier_id uuid,
  supplier_name text NOT NULL,
  project_id text,
  project_name text,
  category text,
  owner_name text,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  payment_terms text,
  delivery_address text,
  delivery_contact text,
  currency text NOT NULL DEFAULT 'TRY',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 20,
  vat_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  order_status text NOT NULL DEFAULT 'Taslak',
  payment_status text NOT NULL DEFAULT 'Planlanmadı',
  delivery_status text NOT NULL DEFAULT 'Planlanmadı',
  invoice_status text NOT NULL DEFAULT 'Fatura Bekleniyor',
  notes text,
  approver_user_id uuid,
  approver_name text,
  submitted_for_approval_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by text,
  rejected_at timestamp with time zone,
  rejected_by text,
  rejection_reason text,
  sent_to_supplier_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  budget_override_reason text,
  version integer NOT NULL DEFAULT 1,
  created_by text,
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchase_orders_order_no_unique UNIQUE (user_id, order_no),
  CONSTRAINT purchase_orders_order_status_check CHECK (order_status IN
    ('Taslak','Onay Bekliyor','Onaylandı','Tedarikçiye Gönderildi','Hazırlanıyor','Kısmi Teslimat','Tamamlandı','İptal')),
  CONSTRAINT purchase_orders_payment_status_check CHECK (payment_status IN
    ('Planlanmadı','Ödeme Planlandı','Kısmen Ödendi','Ödendi','Gecikmiş','İptal')),
  CONSTRAINT purchase_orders_delivery_status_check CHECK (delivery_status IN
    ('Planlanmadı','Hazırlanıyor','Yolda','Kısmi Teslim','Şantiyede','Teslim Edildi','İade','İptal')),
  CONSTRAINT purchase_orders_invoice_status_check CHECK (invoice_status IN
    ('Fatura Bekleniyor','Fatura Geldi','Kontrol Ediliyor','Eşleştirildi','İtirazlı','Ödendi')),
  CONSTRAINT purchase_orders_currency_check CHECK (currency IN ('TRY','USD','EUR')),
  CONSTRAINT purchase_orders_amounts_check CHECK (subtotal >= 0 AND discount >= 0 AND total >= 0)
);

CREATE INDEX purchase_orders_user_idx ON public.purchase_orders (user_id, created_at DESC);
CREATE INDEX purchase_orders_project_idx ON public.purchase_orders (project_id);
CREATE INDEX purchase_orders_request_idx ON public.purchase_orders (purchase_request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view purchase orders" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can create purchase orders" ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Team can update purchase orders" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Team can delete purchase orders" ON public.purchase_orders
  FOR DELETE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));

-- ── Order items ────────────────────────────────────────────────
CREATE TABLE public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  item_type text NOT NULL DEFAULT 'malzeme',
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'adet',
  unit_price numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 20,
  line_total numeric NOT NULL DEFAULT 0,
  delivered_quantity numeric NOT NULL DEFAULT 0,
  accepted_quantity numeric NOT NULL DEFAULT 0,
  rejected_quantity numeric NOT NULL DEFAULT 0,
  warehouse_name text,
  cost_code text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT purchase_order_items_type_check CHECK (item_type IN ('malzeme','hizmet','kiralama','diger')),
  CONSTRAINT purchase_order_items_qty_check CHECK (quantity > 0 AND unit_price >= 0),
  CONSTRAINT purchase_order_items_delivered_check CHECK (delivered_quantity >= 0 AND delivered_quantity <= quantity),
  CONSTRAINT purchase_order_items_accepted_check CHECK (accepted_quantity >= 0 AND rejected_quantity >= 0
    AND accepted_quantity + rejected_quantity <= delivered_quantity)
);
CREATE INDEX purchase_order_items_order_idx ON public.purchase_order_items (order_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view order items" ON public.purchase_order_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert order items" ON public.purchase_order_items
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can update order items" ON public.purchase_order_items
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can delete order items" ON public.purchase_order_items
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));

-- ── Payment schedule ───────────────────────────────────────────
CREATE TABLE public.purchase_order_installments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  installment_no integer NOT NULL,
  payment_type text NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  percentage numeric,
  condition_note text,
  status text NOT NULL DEFAULT 'Planlandı',
  planned_account_id uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT po_installments_unique UNIQUE (order_id, installment_no),
  CONSTRAINT po_installments_amount_check CHECK (amount > 0 AND paid_amount >= 0),
  CONSTRAINT po_installments_status_check CHECK (status IN ('Planlandı','Bekliyor','Kısmen Ödendi','Ödendi','Gecikmiş','İptal'))
);
CREATE INDEX po_installments_order_idx ON public.purchase_order_installments (order_id, installment_no);
CREATE INDEX po_installments_due_idx ON public.purchase_order_installments (due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_installments TO authenticated;
GRANT ALL ON public.purchase_order_installments TO service_role;
ALTER TABLE public.purchase_order_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view installments" ON public.purchase_order_installments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert installments" ON public.purchase_order_installments
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can update installments" ON public.purchase_order_installments
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can delete installments" ON public.purchase_order_installments
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));

-- ── Payment allocations (link to real cash_payments) ───────────
CREATE TABLE public.purchase_order_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.purchase_order_installments(id) ON DELETE SET NULL,
  cash_payment_id uuid REFERENCES public.cash_payments(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL,
  reference_no text,
  description text,
  receipt_url text,
  reversed_at timestamp with time zone,
  reversed_by text,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT po_payments_amount_check CHECK (amount > 0),
  CONSTRAINT po_payments_method_check CHECK (method IN
    ('Banka Havalesi','EFT','Nakit','Kredi Kartı','Çek','Senet','Mahsup','Diğer'))
);
CREATE INDEX po_payments_order_idx ON public.purchase_order_payments (order_id, payment_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_payments TO authenticated;
GRANT ALL ON public.purchase_order_payments TO service_role;
ALTER TABLE public.purchase_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view po payments" ON public.purchase_order_payments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert po payments" ON public.purchase_order_payments
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can update po payments" ON public.purchase_order_payments
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can delete po payments" ON public.purchase_order_payments
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));

-- ── Deliveries ────────────────────────────────────────────────
CREATE TABLE public.purchase_order_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  delivery_no text NOT NULL,
  carrier text,
  vehicle_plate text,
  driver_name text,
  waybill_no text,
  dispatch_date date,
  expected_arrival date,
  actual_arrival date,
  project_id text,
  warehouse_name text,
  status text NOT NULL DEFAULT 'Hazırlanıyor',
  notes text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT po_deliveries_no_unique UNIQUE (order_id, delivery_no),
  CONSTRAINT po_deliveries_status_check CHECK (status IN
    ('Hazırlanıyor','Yolda','Şantiyede','Kısmi Teslim','Teslim Edildi','İade','İptal'))
);
CREATE INDEX po_deliveries_order_idx ON public.purchase_order_deliveries (order_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_deliveries TO authenticated;
GRANT ALL ON public.purchase_order_deliveries TO service_role;
ALTER TABLE public.purchase_order_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view deliveries" ON public.purchase_order_deliveries
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert deliveries" ON public.purchase_order_deliveries
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can update deliveries" ON public.purchase_order_deliveries
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can delete deliveries" ON public.purchase_order_deliveries
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));

CREATE TABLE public.purchase_order_delivery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES public.purchase_order_deliveries(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
  delivered_quantity numeric NOT NULL DEFAULT 0,
  accepted_quantity numeric NOT NULL DEFAULT 0,
  rejected_quantity numeric NOT NULL DEFAULT 0,
  damaged_quantity numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT po_delivery_items_unique UNIQUE (delivery_id, order_item_id),
  CONSTRAINT po_delivery_items_qty_check CHECK (delivered_quantity >= 0 AND accepted_quantity >= 0
    AND rejected_quantity >= 0 AND damaged_quantity >= 0
    AND accepted_quantity + rejected_quantity <= delivered_quantity)
);
CREATE INDEX po_delivery_items_delivery_idx ON public.purchase_order_delivery_items (delivery_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_delivery_items TO authenticated;
GRANT ALL ON public.purchase_order_delivery_items TO service_role;
ALTER TABLE public.purchase_order_delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view delivery items" ON public.purchase_order_delivery_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_order_deliveries d
      JOIN public.purchase_orders o ON o.id = d.order_id
     WHERE d.id = delivery_id AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert delivery items" ON public.purchase_order_delivery_items
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_order_deliveries d
      JOIN public.purchase_orders o ON o.id = d.order_id
     WHERE d.id = delivery_id AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can update delivery items" ON public.purchase_order_delivery_items
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_order_deliveries d
      JOIN public.purchase_orders o ON o.id = d.order_id
     WHERE d.id = delivery_id AND public.can_access_team_resource(auth.uid(), o.user_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_order_deliveries d
      JOIN public.purchase_orders o ON o.id = d.order_id
     WHERE d.id = delivery_id AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can delete delivery items" ON public.purchase_order_delivery_items
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_order_deliveries d
      JOIN public.purchase_orders o ON o.id = d.order_id
     WHERE d.id = delivery_id AND public.can_access_team_resource(auth.uid(), o.user_id)));

-- ── Goods receipt (one per delivery, guards duplicate stock) ────
CREATE TABLE public.purchase_order_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  delivery_id uuid NOT NULL REFERENCES public.purchase_order_deliveries(id) ON DELETE CASCADE,
  receipt_no text NOT NULL,
  received_by text,
  warehouse_name text,
  discrepancy_note text,
  attachment_url text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_posted boolean NOT NULL DEFAULT false,
  stock_posted_at timestamp with time zone,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT po_receipts_delivery_unique UNIQUE (delivery_id)
);
CREATE INDEX po_receipts_order_idx ON public.purchase_order_receipts (order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_receipts TO authenticated;
GRANT ALL ON public.purchase_order_receipts TO service_role;
ALTER TABLE public.purchase_order_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view receipts" ON public.purchase_order_receipts
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert receipts" ON public.purchase_order_receipts
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can update receipts" ON public.purchase_order_receipts
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can delete receipts" ON public.purchase_order_receipts
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));

-- ── Supplier invoices (three-way match) ───────────────────────
CREATE TABLE public.purchase_order_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.purchase_order_deliveries(id) ON DELETE SET NULL,
  e_invoice_id uuid REFERENCES public.e_invoices(id) ON DELETE SET NULL,
  invoice_no text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  withholding numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  status text NOT NULL DEFAULT 'Fatura Geldi',
  file_url text,
  file_name text,
  match_result jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT po_invoices_no_unique UNIQUE (order_id, invoice_no),
  CONSTRAINT po_invoices_status_check CHECK (status IN
    ('Fatura Geldi','Kontrol Ediliyor','Eşleştirildi','İtirazlı','Ödendi')),
  CONSTRAINT po_invoices_amount_check CHECK (subtotal >= 0 AND vat_amount >= 0 AND total >= 0)
);
CREATE INDEX po_invoices_order_idx ON public.purchase_order_invoices (order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_invoices TO authenticated;
GRANT ALL ON public.purchase_order_invoices TO service_role;
ALTER TABLE public.purchase_order_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view po invoices" ON public.purchase_order_invoices
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert po invoices" ON public.purchase_order_invoices
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can update po invoices" ON public.purchase_order_invoices
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can delete po invoices" ON public.purchase_order_invoices
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));

-- ── Audit history (append-only) ───────────────────────────────
CREATE TABLE public.purchase_order_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  actor text NOT NULL,
  event text NOT NULL,
  from_value text,
  to_value text,
  detail text,
  ref_table text,
  ref_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX po_events_order_idx ON public.purchase_order_events (order_id, created_at DESC);

GRANT SELECT, INSERT ON public.purchase_order_events TO authenticated;
GRANT ALL ON public.purchase_order_events TO service_role;
ALTER TABLE public.purchase_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view po events" ON public.purchase_order_events
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));
CREATE POLICY "Team can insert po events" ON public.purchase_order_events
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders o WHERE o.id = order_id
      AND public.can_access_team_resource(auth.uid(), o.user_id)));

-- ── updated_at triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.po_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchase_orders_touch BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.po_touch_updated_at();
CREATE TRIGGER purchase_order_items_touch BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.po_touch_updated_at();
CREATE TRIGGER po_installments_touch BEFORE UPDATE ON public.purchase_order_installments
  FOR EACH ROW EXECUTE FUNCTION public.po_touch_updated_at();
CREATE TRIGGER po_deliveries_touch BEFORE UPDATE ON public.purchase_order_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.po_touch_updated_at();
CREATE TRIGGER po_invoices_touch BEFORE UPDATE ON public.purchase_order_invoices
  FOR EACH ROW EXECUTE FUNCTION public.po_touch_updated_at();