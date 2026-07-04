
-- 1) Extend company_memories with health + provenance fields
ALTER TABLE public.company_memories
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_from text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS user_confirmed boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS company_memories_category_idx
  ON public.company_memories (user_id, category);

-- 2) Dismissed suggestion categories ("never remember this type")
CREATE TABLE IF NOT EXISTS public.memory_dismissed_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_dismissed_categories TO authenticated;
GRANT ALL ON public.memory_dismissed_categories TO service_role;

ALTER TABLE public.memory_dismissed_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own dismissed categories select" ON public.memory_dismissed_categories;
CREATE POLICY "own dismissed categories select"
  ON public.memory_dismissed_categories FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own dismissed categories insert" ON public.memory_dismissed_categories;
CREATE POLICY "own dismissed categories insert"
  ON public.memory_dismissed_categories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own dismissed categories delete" ON public.memory_dismissed_categories;
CREATE POLICY "own dismissed categories delete"
  ON public.memory_dismissed_categories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3) Bump usage stats for a batch of memories
CREATE OR REPLACE FUNCTION public.touch_memories_used(_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.company_memories
     SET usage_count = usage_count + 1,
         last_used_at = now()
   WHERE id = ANY(_ids);
$$;

REVOKE ALL ON FUNCTION public.touch_memories_used(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_memories_used(uuid[]) TO authenticated, service_role;
