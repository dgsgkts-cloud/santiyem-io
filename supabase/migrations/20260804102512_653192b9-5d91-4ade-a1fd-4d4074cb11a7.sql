DO $$
BEGIN
  ALTER TABLE public.stock_movements DISABLE TRIGGER stock_movements_no_update;
  DELETE FROM public.stock_movements WHERE project_id = 'E2E_DEPO_FINAL';
  ALTER TABLE public.stock_movements ENABLE TRIGGER stock_movements_no_update;
END $$;

DELETE FROM public.warehouses WHERE notes = 'E2E_DEPO_FINAL';
DELETE FROM public.materials WHERE code = 'E2E_DEPO_FINAL-MAT-1';