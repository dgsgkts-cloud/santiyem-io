
ALTER TABLE public.communication_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS template_language TEXT,
  ADD COLUMN IF NOT EXISTS template_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_caption TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

ALTER TABLE public.communication_messages
  DROP CONSTRAINT IF EXISTS communication_messages_message_type_check;
ALTER TABLE public.communication_messages
  ADD CONSTRAINT communication_messages_message_type_check
  CHECK (message_type IN ('text','template','image','document','location'));

CREATE INDEX IF NOT EXISTS idx_comm_messages_provider_message_id
  ON public.communication_messages (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
