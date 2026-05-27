
-- 1) Device tokens table
CREATE TABLE public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tokens"
  ON public.device_push_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tokens"
  ON public.device_push_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tokens"
  ON public.device_push_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own tokens"
  ON public.device_push_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_device_push_tokens_user ON public.device_push_tokens(user_id);

-- 2) Extra preference toggles
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_hakedis_approval_request boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_check_due_soon boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_payment_overdue boolean NOT NULL DEFAULT true;

-- 3) De-dup columns on cash_payments so cron does not spam
ALTER TABLE public.cash_payments
  ADD COLUMN IF NOT EXISTS check_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at timestamptz;
