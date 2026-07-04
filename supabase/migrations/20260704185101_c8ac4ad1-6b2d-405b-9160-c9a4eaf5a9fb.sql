
-- Sprint 9.1 — Enterprise Email Provider
-- Adds per-tenant configurable email accounts, plus CC/BCC/attachment/delivery
-- tracking columns on the shared communication_messages log.

CREATE TYPE public.email_provider AS ENUM (
  'smtp','microsoft_graph','gmail','sendgrid','ses','mailgun','lovable'
);
CREATE TYPE public.email_account_status AS ENUM (
  'active','disabled','error','unverified'
);

CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  from_email text NOT NULL,
  reply_to text,
  signature text,
  provider public.email_provider NOT NULL DEFAULT 'smtp',
  status public.email_account_status NOT NULL DEFAULT 'unverified',
  is_default boolean NOT NULL DEFAULT false,
  -- Non-secret configuration only (host, port, secure, username, region, api key
  -- environment-variable NAMES). Actual secret values are stored in Supabase
  -- Secrets and referenced by name here — never in plaintext.
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_accounts_user ON public.email_accounts(user_id, is_default DESC, created_at DESC);
-- One default account per user
CREATE UNIQUE INDEX idx_email_accounts_one_default
  ON public.email_accounts(user_id) WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_accounts TO authenticated;
GRANT ALL ON public.email_accounts TO service_role;

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own email accounts" ON public.email_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own email accounts" ON public.email_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own email accounts" ON public.email_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own email accounts" ON public.email_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend communication_messages for CC/BCC, related project/action, account,
-- and additional delivery timestamps used by email (delivered/opened/failed).
ALTER TABLE public.communication_messages
  ADD COLUMN IF NOT EXISTS cc jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bcc jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS email_account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id text,
  ADD COLUMN IF NOT EXISTS related_action text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_comm_msgs_project
  ON public.communication_messages(user_id, project_id, created_at DESC)
  WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_msgs_channel
  ON public.communication_messages(user_id, channel, created_at DESC);
-- Full-text search over subject/body/recipient for the Communication Center
-- search bar. Uses simple config so it works across languages.
CREATE INDEX IF NOT EXISTS idx_comm_msgs_fts
  ON public.communication_messages
  USING gin (to_tsvector('simple',
    coalesce(subject,'') || ' ' || coalesce(body,'') || ' ' ||
    coalesce(recipient,'') || ' ' || coalesce(recipient_name,'')
  ));
