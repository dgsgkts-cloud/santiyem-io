DROP POLICY IF EXISTS "Anyone can submit EKB application" ON public.ekb_basvurulari;

REVOKE INSERT ON public.ekb_basvurulari FROM anon;
REVOKE INSERT ON public.ekb_basvurulari FROM authenticated;
GRANT ALL ON public.ekb_basvurulari TO service_role;

ALTER TABLE public.ekb_basvurulari
  ADD CONSTRAINT ekb_il_ilce_len_chk CHECK (char_length(il_ilce) BETWEEN 2 AND 120),
  ADD CONSTRAINT ekb_bina_tipi_chk CHECK (bina_tipi IN ('Konut','Ticari','Sanayi','Kamu','Diğer')),
  ADD CONSTRAINT ekb_mesaj_len_chk CHECK (mesaj IS NULL OR char_length(mesaj) <= 1000);