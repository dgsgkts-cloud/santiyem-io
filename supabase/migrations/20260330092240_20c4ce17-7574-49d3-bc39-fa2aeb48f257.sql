
-- Project hakedis (progress payments) table
CREATE TABLE public.project_hakedis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id text NOT NULL,
  period text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  kdv numeric NOT NULL DEFAULT 0,
  net numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Bekliyor',
  status_color text NOT NULL DEFAULT '#F59E0B',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_hakedis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hakedis"
  ON public.project_hakedis FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Project files table
CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text DEFAULT 'application/octet-stream',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own project files"
  ON public.project_files FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true);

CREATE POLICY "Users can upload project files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own project files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own project files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view project files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'project-files');
