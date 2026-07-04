
-- 1) Add semantic + metadata columns
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS token_count integer,
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedding_model_version text,
  ADD COLUMN IF NOT EXISTS embedding_created_at timestamptz;

-- 2) Vector HNSW index (cosine)
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3) Full-text index (Turkish) for hybrid rank
CREATE INDEX IF NOT EXISTS document_chunks_content_fts
  ON public.document_chunks
  USING gin (to_tsvector('turkish', coalesce(content, '')));

-- 4) Content-hash lookup for dedupe / skip re-embed
CREATE INDEX IF NOT EXISTS document_chunks_content_hash_idx
  ON public.document_chunks (document_id, content_hash);

-- 5) Hybrid search RPC
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  _user_id uuid,
  _query_embedding vector(1536),
  _query_text text DEFAULT NULL,
  _match_count integer DEFAULT 8,
  _min_similarity float DEFAULT 0.35,
  _project_id text DEFAULT NULL,
  _supplier text DEFAULT NULL,
  _doc_type text DEFAULT NULL,
  _tags text[] DEFAULT NULL,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _language text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  page_number integer,
  content text,
  similarity float,
  fts_rank float,
  pinned boolean,
  is_global boolean,
  doc_type text,
  supplier text,
  tags text[],
  score float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      CASE
        WHEN _query_text IS NULL OR length(trim(_query_text)) = 0 THEN NULL
        ELSE websearch_to_tsquery('turkish', _query_text)
      END AS tsq
  ),
  candidates AS (
    SELECT
      c.id AS chunk_id,
      c.document_id,
      d.name AS document_name,
      c.page_number,
      c.content,
      (1 - (c.embedding <=> _query_embedding))::float AS similarity,
      CASE
        WHEN q.tsq IS NULL THEN 0::float
        ELSE ts_rank_cd(
          to_tsvector('turkish', coalesce(c.content, '')),
          q.tsq
        )::float
      END AS fts_rank,
      COALESCE(d.pinned, false) AS pinned,
      COALESCE(d.is_global, false) AS is_global,
      d.doc_type,
      d.supplier,
      d.tags
    FROM public.document_chunks c
    JOIN public.documents d ON d.id = c.document_id
    CROSS JOIN q
    WHERE
      c.embedding IS NOT NULL
      AND (c.user_id = _user_id OR c.is_global = true)
      AND (_project_id IS NULL OR d.project_id::text = _project_id)
      AND (_supplier IS NULL OR d.supplier = _supplier)
      AND (_doc_type IS NULL OR d.doc_type = _doc_type)
      AND (_tags IS NULL OR d.tags && _tags)
      AND (_date_from IS NULL OR d.doc_date >= _date_from)
      AND (_date_to IS NULL OR d.doc_date <= _date_to)
      AND (_language IS NULL OR d.language = _language)
      AND (
        (1 - (c.embedding <=> _query_embedding)) >= _min_similarity
        OR (q.tsq IS NOT NULL AND to_tsvector('turkish', coalesce(c.content, '')) @@ q.tsq)
      )
  )
  SELECT
    chunk_id,
    document_id,
    document_name,
    page_number,
    content,
    similarity,
    fts_rank,
    pinned,
    is_global,
    doc_type,
    supplier,
    tags,
    -- Hybrid rank: semantic + full-text + pinned/global boost
    (
      (similarity * 1.0)
      + (LEAST(fts_rank, 1.0) * 0.4)
      + (CASE WHEN pinned THEN 0.15 ELSE 0 END)
      + (CASE WHEN is_global THEN 0.05 ELSE 0 END)
    )::float AS score
  FROM candidates
  ORDER BY score DESC
  LIMIT _match_count;
$$;

REVOKE ALL ON FUNCTION public.match_document_chunks(uuid, vector, text, integer, float, text, text, text, text[], date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(uuid, vector, text, integer, float, text, text, text, text[], date, date, text) TO authenticated, service_role;

-- 6) Update last_used_at helper (bump when a document's chunk is retrieved)
CREATE OR REPLACE FUNCTION public.touch_documents_used(_doc_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.documents
     SET last_used_at = now()
   WHERE id = ANY(_doc_ids);
$$;

REVOKE ALL ON FUNCTION public.touch_documents_used(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_documents_used(uuid[]) TO authenticated, service_role;
