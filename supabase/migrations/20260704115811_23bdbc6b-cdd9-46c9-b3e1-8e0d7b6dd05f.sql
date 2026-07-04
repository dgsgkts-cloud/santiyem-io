
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS doc_type text,
  ADD COLUMN IF NOT EXISTS project_id text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS doc_date date,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'tr',
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

CREATE INDEX IF NOT EXISTS documents_pinned_idx ON public.documents(user_id, pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS documents_last_used_idx ON public.documents(user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS documents_tags_idx ON public.documents USING gin(tags);
