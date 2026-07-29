ALTER TABLE public.communication_messages
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_code text;

ALTER TABLE public.communication_messages ALTER COLUMN max_retries SET DEFAULT 5;
UPDATE public.communication_messages SET max_retries = 5 WHERE max_retries < 5;

ALTER TABLE public.communication_delivery_attempts
  ADD COLUMN IF NOT EXISTS attempt_number integer,
  ADD COLUMN IF NOT EXISTS channel public.comm_channel,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS retryable boolean,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_comm_msgs_dispatch
  ON public.communication_messages (scheduled_at, next_retry_at)
  WHERE status IN ('queued','retrying','scheduled');

CREATE INDEX IF NOT EXISTS idx_comm_msgs_processing
  ON public.communication_messages (processing_started_at)
  WHERE status = 'processing';

CREATE OR REPLACE FUNCTION public.claim_due_communications(_limit integer DEFAULT 25)
RETURNS SETOF public.communication_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.communication_messages m
     SET status = 'processing',
         processing_started_at = now(),
         updated_at = now()
   WHERE m.id IN (
     SELECT c.id
       FROM public.communication_messages c
      WHERE c.status IN ('queued','retrying','scheduled')
        AND (c.scheduled_at IS NULL OR c.scheduled_at <= now())
        AND (c.next_retry_at IS NULL OR c.next_retry_at <= now())
      ORDER BY COALESCE(c.scheduled_at, c.created_at) ASC
      LIMIT GREATEST(1, LEAST(_limit, 50))
      FOR UPDATE SKIP LOCKED
   )
  RETURNING m.*;
$$;

CREATE OR REPLACE FUNCTION public.recover_stale_communications(_older_than_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.communication_messages
     SET status = 'retrying',
         next_retry_at = now(),
         processing_started_at = NULL,
         error = COALESCE(error, 'Gönderim yarıda kaldı, yeniden kuyruğa alındı'),
         error_code = COALESCE(error_code, 'stale_processing'),
         updated_at = now()
   WHERE status = 'processing'
     AND processing_started_at IS NOT NULL
     AND processing_started_at < now() - make_interval(mins => GREATEST(1, _older_than_minutes));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_communications(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recover_stale_communications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_communications(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_stale_communications(integer) TO service_role;