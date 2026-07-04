
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE public.memory_type AS ENUM (
  'company','project','personnel','supplier','decision','preference','other'
);

CREATE TABLE public.company_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid,
  type public.memory_type NOT NULL DEFAULT 'other',
  title text,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  confidence numeric NOT NULL DEFAULT 0.8,
  pinned boolean NOT NULL DEFAULT false,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX company_memories_user_idx ON public.company_memories(user_id);
CREATE INDEX company_memories_team_idx ON public.company_memories(team_id);
CREATE INDEX company_memories_type_idx ON public.company_memories(type);
CREATE INDEX company_memories_embedding_idx
  ON public.company_memories USING hnsw (embedding vector_cosine_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_memories TO authenticated;
GRANT ALL ON public.company_memories TO service_role;

ALTER TABLE public.company_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read team memories"
  ON public.company_memories FOR SELECT TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users insert own memories"
  ON public.company_memories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update team memories"
  ON public.company_memories FOR UPDATE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (public.can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users delete team memories"
  ON public.company_memories FOR DELETE TO authenticated
  USING (public.can_access_team_resource(auth.uid(), user_id));

CREATE TRIGGER update_company_memories_updated_at
  BEFORE UPDATE ON public.company_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.match_company_memories(
  _user_id uuid,
  _query_embedding vector(1536),
  _match_count int DEFAULT 6,
  _min_similarity float DEFAULT 0.55,
  _type public.memory_type DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  type public.memory_type,
  title text,
  content text,
  metadata jsonb,
  source text,
  confidence numeric,
  pinned boolean,
  updated_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.type, m.title, m.content, m.metadata, m.source,
         m.confidence, m.pinned, m.updated_at,
         1 - (m.embedding <=> _query_embedding) AS similarity
  FROM public.company_memories m
  WHERE public.can_access_team_resource(_user_id, m.user_id)
    AND m.embedding IS NOT NULL
    AND (_type IS NULL OR m.type = _type)
    AND (1 - (m.embedding <=> _query_embedding)) >= _min_similarity
  ORDER BY m.pinned DESC, m.embedding <=> _query_embedding
  LIMIT _match_count;
$$;
