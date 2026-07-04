-- Communication Hub foundation: unified message log + delivery attempts
CREATE TYPE public.comm_channel AS ENUM ('whatsapp','email','sms','push','teams','slack');
CREATE TYPE public.comm_status AS ENUM ('draft','pending_approval','scheduled','queued','sending','sent','failed','cancelled');
CREATE TYPE public.comm_priority AS ENUM ('low','normal','high','urgent');

CREATE TABLE public.communication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.comm_channel NOT NULL,
  recipient text NOT NULL,
  recipient_name text,
  subject text,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority public.comm_priority NOT NULL DEFAULT 'normal',
  status public.comm_status NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider text,
  provider_message_id text,
  error text,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  created_from text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.communication_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.communication_messages(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  status public.comm_status NOT NULL,
  provider text,
  response jsonb,
  error text
);

CREATE INDEX idx_comm_msgs_user_status ON public.communication_messages (user_id, status, created_at DESC);
CREATE INDEX idx_comm_msgs_scheduled ON public.communication_messages (scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_comm_attempts_msg ON public.communication_delivery_attempts (message_id, attempted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_messages TO authenticated;
GRANT ALL ON public.communication_messages TO service_role;
GRANT SELECT, INSERT ON public.communication_delivery_attempts TO authenticated;
GRANT ALL ON public.communication_delivery_attempts TO service_role;

ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own messages" ON public.communication_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON public.communication_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own messages" ON public.communication_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages" ON public.communication_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users select own attempts" ON public.communication_delivery_attempts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.communication_messages m
            WHERE m.id = message_id AND m.user_id = auth.uid())
  );
CREATE POLICY "Users insert own attempts" ON public.communication_delivery_attempts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.communication_messages m
            WHERE m.id = message_id AND m.user_id = auth.uid())
  );

CREATE TRIGGER trg_comm_msgs_updated_at
  BEFORE UPDATE ON public.communication_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();