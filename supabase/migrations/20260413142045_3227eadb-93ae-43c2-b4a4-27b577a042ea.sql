
CREATE TABLE public.ekb_basvurulari (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_soyad TEXT NOT NULL,
  telefon TEXT NOT NULL,
  il_ilce TEXT NOT NULL,
  bina_tipi TEXT NOT NULL DEFAULT 'Konut',
  mesaj TEXT,
  durum TEXT NOT NULL DEFAULT 'yeni',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ekb_basvurulari ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can submit EKB application"
ON public.ekb_basvurulari FOR INSERT
WITH CHECK (true);

-- Only admin can read
CREATE POLICY "Admin can read EKB applications"
ON public.ekb_basvurulari FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admin can update
CREATE POLICY "Admin can update EKB applications"
ON public.ekb_basvurulari FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admin can delete
CREATE POLICY "Admin can delete EKB applications"
ON public.ekb_basvurulari FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);
