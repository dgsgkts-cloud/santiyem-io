
-- 1. Cash Accounts (Kasa/Banka Hesapları)
CREATE TABLE public.cash_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'nakit_kasa',
  balance NUMERIC NOT NULL DEFAULT 0,
  bank_name TEXT,
  iban TEXT,
  account_no TEXT,
  branch TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team accounts" ON public.cash_accounts FOR SELECT USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can insert own accounts" ON public.cash_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own or team accounts" ON public.cash_accounts FOR UPDATE USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can delete own accounts" ON public.cash_accounts FOR DELETE USING (user_id = auth.uid());

-- 2. Cash Payments (Ödemeler)
CREATE TABLE public.cash_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recipient TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Diğer',
  project_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'nakit',
  status TEXT NOT NULL DEFAULT 'odendi',
  description TEXT,
  account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  check_no TEXT,
  check_bank TEXT,
  check_due_date DATE,
  iban TEXT,
  bank_name TEXT,
  invoice_url TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_interval TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team payments" ON public.cash_payments FOR SELECT USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can insert own payments cp" ON public.cash_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own or team payments cp" ON public.cash_payments FOR UPDATE USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can delete own payments cp" ON public.cash_payments FOR DELETE USING (user_id = auth.uid());

-- 3. Cash Collections (Tahsilatlar)
CREATE TABLE public.cash_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sender TEXT NOT NULL DEFAULT '',
  collection_type TEXT NOT NULL DEFAULT 'diger',
  project_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'nakit',
  status TEXT NOT NULL DEFAULT 'bekleniyor',
  description TEXT,
  account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  check_no TEXT,
  check_bank TEXT,
  check_due_date DATE,
  hakedis_id UUID,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team collections" ON public.cash_collections FOR SELECT USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can insert own collections" ON public.cash_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own or team collections" ON public.cash_collections FOR UPDATE USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can delete own collections" ON public.cash_collections FOR DELETE USING (user_id = auth.uid());

-- 4. Cash Checks (Çekler)
CREATE TABLE public.cash_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  check_type TEXT NOT NULL DEFAULT 'verilen',
  check_no TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  branch TEXT,
  account_no TEXT,
  counterparty TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL DEFAULT 'bekliyor',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team checks" ON public.cash_checks FOR SELECT USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can insert own checks" ON public.cash_checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own or team checks" ON public.cash_checks FOR UPDATE USING (can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "Users can delete own checks" ON public.cash_checks FOR DELETE USING (user_id = auth.uid());
