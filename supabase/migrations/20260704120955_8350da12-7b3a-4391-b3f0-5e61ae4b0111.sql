
DROP POLICY IF EXISTS "Users insert own memories" ON public.company_memories;
CREATE POLICY "Users insert own memories" ON public.company_memories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_global = false);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_global = false)
  WITH CHECK (auth.uid() = user_id AND is_global = false);

DROP POLICY IF EXISTS "Users can insert own chunks" ON public.document_chunks;
CREATE POLICY "Users can insert own chunks" ON public.document_chunks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_global = false);
