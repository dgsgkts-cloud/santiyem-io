CREATE TABLE public.project_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id text NOT NULL,
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'Diğer',
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  has_invoice boolean NOT NULL DEFAULT false,
  invoice_no text,
  invoice_url text,
  note text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team expenses"
ON public.project_expenses FOR SELECT
TO authenticated
USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can insert own expenses"
ON public.project_expenses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own or team expenses"
ON public.project_expenses FOR UPDATE
TO authenticated
USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can delete own expenses"
ON public.project_expenses FOR DELETE
TO authenticated
USING (user_id = auth.uid());