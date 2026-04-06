
-- Create user_cards table for managing multiple saved cards
CREATE TABLE public.user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_user_key text NOT NULL,
  card_token text NOT NULL,
  card_alias text NOT NULL DEFAULT '',
  card_type text NOT NULL DEFAULT 'UNKNOWN',
  card_association text NOT NULL DEFAULT 'UNKNOWN',
  card_bank_name text,
  bin_number text,
  last_four_digits text NOT NULL DEFAULT '****',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

-- Users can view their own cards
CREATE POLICY "Users can view own cards"
ON public.user_cards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own cards
CREATE POLICY "Users can insert own cards"
ON public.user_cards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update own cards
CREATE POLICY "Users can update own cards"
ON public.user_cards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own cards
CREATE POLICY "Users can delete own cards"
ON public.user_cards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on cards"
ON public.user_cards FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Index
CREATE INDEX idx_user_cards_user_id ON public.user_cards(user_id);

-- Ensure only one default card per user
CREATE UNIQUE INDEX idx_user_cards_default ON public.user_cards(user_id) WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER update_user_cards_updated_at
BEFORE UPDATE ON public.user_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
