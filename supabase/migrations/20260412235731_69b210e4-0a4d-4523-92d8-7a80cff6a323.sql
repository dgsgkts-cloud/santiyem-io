-- Add approval columns to project_hakedis
ALTER TABLE public.project_hakedis
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'taslak',
  ADD COLUMN IF NOT EXISTS approval_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  ADD COLUMN IF NOT EXISTS approval_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_note text,
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0;

-- Create index on token for fast lookup
CREATE INDEX IF NOT EXISTS idx_hakedis_approval_token ON public.project_hakedis(approval_token);

-- Allow public read by token (for client approval page)
CREATE POLICY "Public can read hakedis by token"
  ON public.project_hakedis
  FOR SELECT
  TO anon
  USING (true);

-- Allow public update of approval fields by anon (client approval)
CREATE POLICY "Public can update approval status"
  ON public.project_hakedis
  FOR UPDATE
  TO anon
  USING (approval_token IS NOT NULL)
  WITH CHECK (true);

-- Create hakedis_revisions table
CREATE TABLE public.hakedis_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hakedis_id uuid NOT NULL REFERENCES public.project_hakedis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  revision_number integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hakedis_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own revisions"
  ON public.hakedis_revisions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own revisions"
  ON public.hakedis_revisions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_hakedis_revisions_hakedis ON public.hakedis_revisions(hakedis_id);