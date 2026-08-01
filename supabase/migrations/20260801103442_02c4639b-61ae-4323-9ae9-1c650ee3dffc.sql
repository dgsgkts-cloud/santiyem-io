ALTER TABLE public.purchase_order_deliveries
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS waybill_url text,
  ADD COLUMN IF NOT EXISTS waybill_name text,
  ADD COLUMN IF NOT EXISTS expected_arrival_time text,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS discrepancy_note text,
  ADD COLUMN IF NOT EXISTS return_note text,
  ADD COLUMN IF NOT EXISTS eta_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_expected_arrival date;

ALTER TABLE public.purchase_order_delivery_items
  ADD COLUMN IF NOT EXISTS batch_no text,
  ADD COLUMN IF NOT EXISTS warehouse_name text;

ALTER TABLE public.purchase_order_deliveries
  DROP CONSTRAINT IF EXISTS po_deliveries_status_check;

ALTER TABLE public.purchase_order_deliveries
  ADD CONSTRAINT po_deliveries_status_check CHECK (status = ANY (ARRAY[
    'Planlanmadı'::text,
    'Hazırlanıyor'::text,
    'Sevke Hazır'::text,
    'Yolda'::text,
    'Şantiyeye Ulaştı'::text,
    'Şantiyede'::text,
    'Mal Kabulü Bekliyor'::text,
    'Kısmi Kabul'::text,
    'Kısmi Teslim'::text,
    'Tam Kabul'::text,
    'Teslim Edildi'::text,
    'Hasarlı / Uyuşmazlık'::text,
    'İade Sürecinde'::text,
    'İade'::text,
    'Tamamlandı'::text,
    'İptal'::text
  ]));