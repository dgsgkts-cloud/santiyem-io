-- Canonical consumption source. ONLY genuine operational material use.
-- Excluded by design: transfer_out, transfer_in, goods_receipt, manual_entry,
-- return_in, supplier_return, count_increase, count_decrease, scrap,
-- assignment_out, assignment_return, reversal, and any reversed movement.
CREATE OR REPLACE VIEW public.inventory_consumption
WITH (security_invoker = true) AS
SELECT
  m.user_id                       AS company_id,
  m.warehouse_id,
  m.material_id,
  m.project_id,
  m.transaction_date              AS movement_date,
  m.quantity                      AS consumption_quantity,
  m.unit                          AS base_unit,
  m.id                            AS source_movement_id,
  m.movement_type                 AS consumption_type,
  m.unit_cost,
  m.cost_code,
  m.person
FROM public.stock_movements m
WHERE m.movement_type IN ('project_issue', 'consumption')
  AND m.direction = -1
  AND m.reversed_by IS NULL
  AND m.reversal_of IS NULL;

GRANT SELECT ON public.inventory_consumption TO authenticated;
GRANT SELECT ON public.inventory_consumption TO service_role;

-- Scrap / waste is analysed separately and must never inflate normal demand.
CREATE OR REPLACE VIEW public.inventory_scrap
WITH (security_invoker = true) AS
SELECT
  m.user_id                       AS company_id,
  m.warehouse_id,
  m.material_id,
  m.project_id,
  m.transaction_date              AS movement_date,
  m.quantity                      AS scrap_quantity,
  m.unit                          AS base_unit,
  m.id                            AS source_movement_id,
  m.movement_type                 AS scrap_type,
  m.reason,
  m.unit_cost
FROM public.stock_movements m
WHERE m.movement_type = 'scrap'
  AND m.reversed_by IS NULL
  AND m.reversal_of IS NULL;

GRANT SELECT ON public.inventory_scrap TO authenticated;
GRANT SELECT ON public.inventory_scrap TO service_role;