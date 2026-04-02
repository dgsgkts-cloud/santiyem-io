
CREATE TABLE public.hakedis_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hakedis_id UUID NOT NULL REFERENCES public.project_hakedis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'adet',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hakedis_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hakedis items"
  ON public.hakedis_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own hakedis items"
  ON public.hakedis_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own hakedis items"
  ON public.hakedis_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own hakedis items"
  ON public.hakedis_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
