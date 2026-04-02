
-- Site diary entries table
CREATE TABLE public.site_diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weather_icon TEXT NOT NULL DEFAULT '☀️',
  weather_temp INTEGER,
  work_status TEXT NOT NULL DEFAULT 'normal',
  work_stopped_reason TEXT,
  crews JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_done TEXT DEFAULT '',
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  machines JSONB NOT NULL DEFAULT '[]'::jsonb,
  special_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  general_note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, entry_date)
);

ALTER TABLE public.site_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own diary entries"
  ON public.site_diary_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own or team diary entries"
  ON public.site_diary_entries FOR SELECT
  TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can update own or team diary entries"
  ON public.site_diary_entries FOR UPDATE
  TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can delete own diary entries"
  ON public.site_diary_entries FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Site diary photos table
CREATE TABLE public.site_diary_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  diary_entry_id UUID NOT NULL REFERENCES public.site_diary_entries(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_diary_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own photos"
  ON public.site_diary_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own or team photos"
  ON public.site_diary_photos FOR SELECT
  TO authenticated
  USING (can_access_team_resource(auth.uid(), user_id));

CREATE POLICY "Users can update own photos"
  ON public.site_diary_photos FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own photos"
  ON public.site_diary_photos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket for diary photos
INSERT INTO storage.buckets (id, name, public) VALUES ('site-diary-photos', 'site-diary-photos', true);

CREATE POLICY "Users can upload diary photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-diary-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view diary photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-diary-photos');

CREATE POLICY "Users can delete own diary photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-diary-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime for diary entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_diary_entries;
