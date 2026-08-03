-- 1) create_stock_transfer: güvenlik stoğu override'ı açık yetki gerektirir
CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  _source_warehouse_id uuid, _dest_warehouse_id uuid, _material_id uuid,
  _requested_quantity numeric, _unit text DEFAULT NULL, _required_at date DEFAULT NULL,
  _reason text DEFAULT NULL, _notes text DEFAULT NULL, _project_id text DEFAULT NULL,
  _allow_safety_breach boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid(); owner uuid; m RECORD; src RECORD; dst RECORD;
  factor numeric; qty numeric; pos RECORD; tid uuid; tno text; st text; auto boolean;
  breach boolean := COALESCE(_allow_safety_breach, false);
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.depot_permission('create_transfer') THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF breach AND NOT public.depot_permission('override_safety_stock') THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  owner := public.resolve_billing_owner(uid);

  IF _source_warehouse_id IS NULL OR _dest_warehouse_id IS NULL THEN RAISE EXCEPTION 'invalid_warehouse'; END IF;
  IF _source_warehouse_id = _dest_warehouse_id THEN RAISE EXCEPTION 'same_warehouse'; END IF;

  SELECT * INTO src FROM public.warehouses WHERE id = _source_warehouse_id;
  SELECT * INTO dst FROM public.warehouses WHERE id = _dest_warehouse_id;
  IF src.id IS NULL OR dst.id IS NULL THEN RAISE EXCEPTION 'invalid_warehouse'; END IF;
  IF NOT public.can_access_team_resource(uid, src.user_id) OR NOT public.can_access_team_resource(uid, dst.user_id)
  THEN RAISE EXCEPTION 'cross_company_access'; END IF;
  IF NOT src.is_active OR NOT dst.is_active THEN RAISE EXCEPTION 'warehouse_inactive'; END IF;

  SELECT * INTO m FROM public.materials WHERE id = _material_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'material_not_found'; END IF;
  IF NOT public.can_access_team_resource(uid, m.user_id) THEN RAISE EXCEPTION 'cross_company_access'; END IF;
  IF m.is_active = false THEN RAISE EXCEPTION 'material_inactive'; END IF;
  IF m.stock_type IS DISTINCT FROM 'stockable' THEN RAISE EXCEPTION 'material_not_stockable'; END IF;

  IF _requested_quantity IS NULL OR _requested_quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  factor := public.inv_unit_factor(_material_id, _unit);
  IF factor IS NULL THEN RAISE EXCEPTION 'invalid_unit'; END IF;
  qty := _requested_quantity * factor;

  SELECT * INTO pos FROM public.inv_stock_position(_material_id, _source_warehouse_id);
  IF qty > pos.available THEN RAISE EXCEPTION 'insufficient_available_stock'; END IF;
  IF NOT breach AND COALESCE(m.safety_stock, 0) > 0
     AND (pos.available - qty) < m.safety_stock THEN
    RAISE EXCEPTION 'safety_stock_violation';
  END IF;

  auto := public.depot_permission('approve_transfer') AND owner = uid;
  st := CASE WHEN auto THEN 'approved' ELSE 'pending_approval' END;

  INSERT INTO public.inventory_transfers (
    user_id, material_id, unit, requested_quantity, source_warehouse_id, dest_warehouse_id,
    project_id, requester_id, required_date, reason, notes, status,
    approver_id, approved_at)
  VALUES (owner, _material_id, m.unit, qty, _source_warehouse_id, _dest_warehouse_id,
    _project_id, uid, _required_at, _reason, _notes, st,
    CASE WHEN auto THEN uid ELSE NULL END, CASE WHEN auto THEN now() ELSE NULL END)
  RETURNING id, transfer_no INTO tid, tno;

  PERFORM public.inv_transfer_event(owner, tid, st, 'created', _reason,
    jsonb_build_object('requested_quantity', qty, 'unit', m.unit,
                       'source_warehouse_id', _source_warehouse_id,
                       'dest_warehouse_id', _dest_warehouse_id,
                       'auto_approved', auto,
                       'safety_override', breach));

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, new_value, reason, source_type, source_id)
  VALUES (owner, uid, 'inventory_transfer', tid, 'create',
          jsonb_build_object('transfer_no', tno, 'quantity', qty, 'status', st,
                             'safety_override', breach), _reason, 'inventory_transfer', tid);

  IF NOT auto THEN
    PERFORM public.inv_transfer_notify(tid, 'approval_requested', 'Transfer onayı bekliyor',
      tno || ' numaralı transfer talebi onayınızı bekliyor.');
  END IF;

  RETURN jsonb_build_object('transfer_id', tid, 'transfer_no', tno, 'status', st);
END; $$;

-- 2) dispatch_stock_transfer: diğer transferlerin rezervasyonlarını da dikkate al
CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(
  _transfer_id uuid, _dispatched_quantity numeric, _unit text DEFAULT NULL,
  _dispatched_at timestamptz DEFAULT NULL, _expected_arrival_at timestamptz DEFAULT NULL,
  _reference text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid(); t RECORD; m RECORD; pos RECORD; factor numeric; qty numeric;
  remaining numeric; cost numeric; eid uuid; mid uuid; st text; when_ts timestamptz;
  own_reserved numeric; other_reserved numeric; dispatchable numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.depot_permission('dispatch_transfer') THEN RAISE EXCEPTION 'permission_denied'; END IF;

  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'transfer_not_found'; END IF;
  IF NOT public.can_access_team_resource(uid, t.user_id) THEN RAISE EXCEPTION 'cross_company_access'; END IF;
  IF t.status IN ('cancelled','rejected','received','discrepancy') THEN RAISE EXCEPTION 'invalid_transfer_status'; END IF;
  IF t.status NOT IN ('approved','ready_to_dispatch','partially_dispatched') THEN RAISE EXCEPTION 'invalid_transfer_status'; END IF;

  IF _dispatched_quantity IS NULL OR _dispatched_quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  factor := public.inv_unit_factor(t.material_id, COALESCE(_unit, t.unit));
  IF factor IS NULL THEN RAISE EXCEPTION 'invalid_unit'; END IF;
  qty := _dispatched_quantity * factor;

  remaining := t.requested_quantity - t.dispatched_quantity;
  IF qty > remaining THEN RAISE EXCEPTION 'quantity_exceeds_remaining'; END IF;

  -- Aynı sevk belgesinin ikinci kez işlenmesini engelle
  IF _reference IS NOT NULL AND btrim(_reference) <> '' AND EXISTS (
       SELECT 1 FROM public.inventory_transfer_events e
        WHERE e.transfer_id = _transfer_id AND e.action = 'dispatch'
          AND e.payload->>'reference' = btrim(_reference))
  THEN RAISE EXCEPTION 'transfer_already_dispatched'; END IF;

  SELECT * INTO m FROM public.materials WHERE id = t.material_id;
  SELECT * INTO pos FROM public.inv_stock_position(t.material_id, t.source_warehouse_id);

  -- Bu transferin kendi rezervasyonu düşülmez, diğer onaylı transferlerin rezervasyonu korunur
  own_reserved := GREATEST(remaining, 0);
  other_reserved := GREATEST(COALESCE(pos.reserved, 0) - own_reserved, 0);
  dispatchable := pos.on_hand - other_reserved;
  IF qty > dispatchable THEN RAISE EXCEPTION 'insufficient_available_stock'; END IF;

  SELECT avg_cost INTO cost FROM public.inventory_balances
   WHERE material_id = t.material_id AND warehouse_id = t.source_warehouse_id LIMIT 1;

  when_ts := COALESCE(_dispatched_at, now());
  eid := public.inv_transfer_event(t.user_id, _transfer_id, 'in_transit', 'dispatch', _notes,
    jsonb_build_object('quantity', qty, 'unit', t.unit, 'reference', NULLIF(btrim(COALESCE(_reference,'')),''),
                       'dispatched_at', when_ts, 'expected_arrival_at', _expected_arrival_at,
                       'unit_cost', cost));

  INSERT INTO public.stock_movements (
    user_id, movement_type, reason, direction, material_id, warehouse_id, counter_warehouse_id,
    quantity, unit, unit_cost, total_cost, project_id, source_type, source_id, source_document,
    notes, actor_id, transaction_date)
  VALUES (t.user_id, 'transfer_out', 'depolar arası transfer sevkiyatı', -1, t.material_id,
    t.source_warehouse_id, t.dest_warehouse_id, qty, t.unit, cost,
    CASE WHEN cost IS NULL THEN NULL ELSE cost * qty END, t.project_id,
    'inventory_transfer', eid, t.transfer_no, _notes, uid, when_ts::date)
  RETURNING id INTO mid;

  UPDATE public.inventory_transfer_events
     SET payload = payload || jsonb_build_object('movement_id', mid)
   WHERE id = eid;

  st := CASE WHEN (t.dispatched_quantity + qty) < t.requested_quantity THEN 'partially_dispatched' ELSE 'in_transit' END;

  UPDATE public.inventory_transfers
     SET dispatched_quantity = dispatched_quantity + qty,
         in_transit_quantity = in_transit_quantity + qty,
         unit_cost = COALESCE(unit_cost, cost),
         dispatcher_id = uid,
         dispatched_at = COALESCE(dispatched_at, when_ts),
         expected_arrival_at = COALESCE(_expected_arrival_at, expected_arrival_at),
         expected_arrival = COALESCE(_expected_arrival_at::date, expected_arrival),
         dispatch_reference = COALESCE(NULLIF(btrim(COALESCE(_reference,'')),''), dispatch_reference),
         dispatch_movement_id = COALESCE(dispatch_movement_id, mid),
         status = st,
         updated_at = now()
   WHERE id = _transfer_id;

  UPDATE public.inventory_transfer_events SET status = st WHERE id = eid;

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, previous_value, new_value, reason, source_type, source_id)
  VALUES (t.user_id, uid, 'inventory_transfer', _transfer_id, 'dispatch',
          jsonb_build_object('status', t.status, 'dispatched', t.dispatched_quantity),
          jsonb_build_object('status', st, 'dispatched', t.dispatched_quantity + qty, 'movement_id', mid),
          _notes, 'inventory_transfer', _transfer_id);

  PERFORM public.inv_transfer_notify(_transfer_id, 'dispatched_' || eid::text, 'Transfer sevk edildi',
    t.transfer_no || ' numaralı transferde ' || trim(to_char(qty, 'FM999999990.999')) || ' ' || t.unit || ' yola çıktı.');

  RETURN jsonb_build_object('transfer_id', _transfer_id, 'status', st, 'movement_id', mid,
                            'dispatched_quantity', t.dispatched_quantity + qty,
                            'in_transit_quantity', t.in_transit_quantity + qty);
END; $$;

REVOKE ALL ON FUNCTION public.create_stock_transfer(uuid,uuid,uuid,numeric,text,date,text,text,text,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_stock_transfer(uuid,numeric,text,timestamptz,timestamptz,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer(uuid,uuid,uuid,numeric,text,date,text,text,text,boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_stock_transfer(uuid,numeric,text,timestamptz,timestamptz,text,text) TO authenticated, service_role;

-- 3) Doğrudan satır düzenlemelerini kapat: tüm yazma işlemleri RPC üzerinden
DROP POLICY IF EXISTS "Team can create transfers" ON public.inventory_transfers;
DROP POLICY IF EXISTS "Team can update transfers" ON public.inventory_transfers;
DROP POLICY IF EXISTS "Owner can delete draft transfers" ON public.inventory_transfers;
DROP POLICY IF EXISTS "Team can add transfer events" ON public.inventory_transfer_events;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.inventory_transfers FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.inventory_transfer_events FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.stock_movements FROM authenticated, anon;
REVOKE ALL ON public.inventory_transfers FROM anon;
REVOKE ALL ON public.inventory_transfer_events FROM anon;
REVOKE ALL ON public.stock_movements FROM anon;

GRANT SELECT ON public.inventory_transfers TO authenticated;
GRANT SELECT ON public.inventory_transfer_events TO authenticated;
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.inventory_transfers TO service_role;
GRANT ALL ON public.inventory_transfer_events TO service_role;
GRANT ALL ON public.stock_movements TO service_role;