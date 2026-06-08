
-- Drop Turkish national ID column never used in app (security: PII exposure)
ALTER TABLE public.worker_attendance DROP COLUMN IF EXISTS tc_no;

-- Stop broadcasting site_diary_entries via Realtime (no realtime subscribers in app)
ALTER PUBLICATION supabase_realtime DROP TABLE public.site_diary_entries;

-- Lock down search_path on normalize_phone
ALTER FUNCTION public.normalize_phone(text) SET search_path = public;

-- Basic input sanity on public EKB form
ALTER TABLE public.ekb_basvurulari
  ADD CONSTRAINT ekb_telefon_len_chk CHECK (telefon IS NULL OR char_length(telefon) BETWEEN 5 AND 25),
  ADD CONSTRAINT ekb_ad_soyad_len_chk CHECK (char_length(ad_soyad) BETWEEN 2 AND 120);
