CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_key text NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification reads"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification reads"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification reads"
  ON public.notification_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification reads"
  ON public.notification_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notification_reads_user_idx ON public.notification_reads (user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_reads;