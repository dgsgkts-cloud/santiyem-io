CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid,
  provider text NOT NULL DEFAULT 'evolution',
  instance_name text NOT NULL UNIQUE,
  external_instance_id text,
  connected_number text,
  display_name text,
  connection_status text NOT NULL DEFAULT 'disconnected',
  connection_mode text NOT NULL DEFAULT 'qr',
  connected_at timestamptz,
  last_connected_at timestamptz,
  last_disconnected_at timestamptz,
  last_health_check timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_connections_user_idx ON public.whatsapp_connections (user_id);
CREATE INDEX IF NOT EXISTS whatsapp_connections_instance_idx ON public.whatsapp_connections (instance_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_connections TO authenticated;
GRANT ALL ON public.whatsapp_connections TO service_role;

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_connections_select_own" ON public.whatsapp_connections;
CREATE POLICY "whatsapp_connections_select_own" ON public.whatsapp_connections
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_connections_insert_own" ON public.whatsapp_connections;
CREATE POLICY "whatsapp_connections_insert_own" ON public.whatsapp_connections
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_connections_update_own" ON public.whatsapp_connections;
CREATE POLICY "whatsapp_connections_update_own" ON public.whatsapp_connections
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_connections_delete_own" ON public.whatsapp_connections;
CREATE POLICY "whatsapp_connections_delete_own" ON public.whatsapp_connections
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_message_logs
  ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL;