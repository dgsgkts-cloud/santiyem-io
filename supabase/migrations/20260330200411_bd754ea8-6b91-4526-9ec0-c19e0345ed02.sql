
-- Gayrimenkul360 listings table
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_type text NOT NULL DEFAULT 'arsa', -- arsa or gayrimenkul
  property_type text DEFAULT NULL, -- daire, villa, ofis, bina, proje
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  contact text NOT NULL DEFAULT '',
  rooms text DEFAULT NULL,
  sqm numeric DEFAULT NULL,
  floor_info text DEFAULT NULL,
  parcel_il text DEFAULT NULL,
  parcel_ilce text DEFAULT NULL,
  parcel_ada text DEFAULT NULL,
  parcel_parsel text DEFAULT NULL,
  parcel_area_sqm numeric DEFAULT NULL,
  parcel_coords jsonb DEFAULT NULL,
  parcel_center_lat double precision DEFAULT NULL,
  parcel_center_lng double precision DEFAULT NULL,
  media_urls jsonb DEFAULT '[]'::jsonb,
  video_url text DEFAULT NULL,
  video_status text DEFAULT 'none', -- none, generating, ready
  status text NOT NULL DEFAULT 'taslak', -- taslak, yayinda, arsivlendi
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own listings"
  ON public.listings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
