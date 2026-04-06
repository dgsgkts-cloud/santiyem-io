-- Add subscription_type to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'monthly';

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  invoice_date timestamp with time zone NOT NULL DEFAULT now(),
  iyzico_payment_id text,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can insert invoices
CREATE POLICY "Service role can insert invoices"
ON public.invoices FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role'::text);

-- Service role can update invoices
CREATE POLICY "Service role can update invoices"
ON public.invoices FOR UPDATE
TO public
USING (auth.role() = 'service_role'::text);

-- Index for fast lookup
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON public.invoices(subscription_id);