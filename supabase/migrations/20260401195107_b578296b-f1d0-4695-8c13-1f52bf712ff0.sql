
-- Add is_global flag to documents
ALTER TABLE public.documents ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT false;

-- Add is_global flag to document_chunks  
ALTER TABLE public.document_chunks ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT false;

-- Make user_id nullable for global docs
ALTER TABLE public.documents ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.document_chunks ALTER COLUMN user_id DROP NOT NULL;

-- Allow all authenticated users to read global documents
CREATE POLICY "Anyone can view global documents" ON public.documents FOR SELECT USING (is_global = true);
CREATE POLICY "Anyone can view global chunks" ON public.document_chunks FOR SELECT USING (is_global = true);
