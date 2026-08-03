CREATE INDEX IF NOT EXISTS idx_inventory_transfers_created
  ON public.inventory_transfers (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_no
  ON public.inventory_transfers (transfer_no);
