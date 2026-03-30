
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  client text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  manager text NOT NULL DEFAULT '',
  site_responsible text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  budget text NOT NULL DEFAULT '',
  start_date text NOT NULL DEFAULT '',
  end_date text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Devam Ediyor',
  status_color text NOT NULL DEFAULT '#22C55E',
  progress int NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
