-- ============================================================
-- DEPO FAZ 2 / BÖLÜM 2 — Transfer iş akışı (RPC katmanı)
-- Mevcut tablolar, kanonik defter (stock_movements) ve
-- inventory_transit_balances görünümü kullanılır; paralel bakiye yok.
-- ============================================================

ALTER TABLE public.inventory_transfers
  ADD COLUMN IF NOT EXISTS rejected_quantity numeric NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS dispatch_reference text,
  ADD COLUMN IF NOT EXISTS expected_arrival_at timestamptz;

ALTER TABLE public.inventory_transfers DROP CONSTRAINT IF EXISTS inventory_transfers_status_check;
ALTER TABLE public.inventory_transfers ADD CONSTRAINT inventory_transfers_status_check
  CHECK (status = ANY (ARRAY['requested','pending_approval','approved','ready_to_dispatch',
                             'partially_dispatched','in_transit','partially_received',
                             'received','discrepancy','rejected','cancelled']));

-- Tekrarsız bildirim anahtarı
CREATE UNIQUE INDEX IF NOT EXISTS notification_history_dedupe
  ON public.notification_history (user_id, notification_type, (metadata->>'dedupe_key'))
  WHERE metadata ? 'dedupe_key';

-- ─────────────────────────── yardımcılar ───────────────────────────

-- Birim çevrim katsayısı: hareket birimi → malzeme birimi. Uyumsuzsa NULL.
CREATE OR REPLACE FUNCTION public.inv_unit_factor(_material_id uuid, _unit text)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE mu text; d1 text; d2 text; f1 numeric; f2 numeric;
BEGIN
  SELECT lower(unit) INTO mu FROM public.materials WHERE id = _material_id;
  IF mu IS NULL THEN RETURN NULL; END IF;
  IF _unit IS NULL OR btrim(_unit) = '' OR lower(_unit) = mu THEN RETURN 1; END IF;
  SELECT dimension, to_base INTO d1, f1 FROM public.unit_dimensions WHERE unit = lower(_unit);
  SELECT dimension, to_base INTO d2, f2 FROM public.unit_dimensions WHERE unit = mu;
  IF d1 IS NULL OR d2 IS NULL OR d1 <> d2 OR f2 IS NULL OR f2 = 0 THEN RETURN NULL; END IF;
  RETURN f1 / f2;
END; $$;

-- Depo × malzeme stok gerçeği: eldeki, rezerve (onaylı ama sevk edilmemiş), kullanılabilir.
CREATE OR REPLACE FUNCTION public.inv_stock_position(_material_id uuid, _warehouse_id uuid)
RETURNS TABLE(on_hand numeric, reserved numeric, available numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT SUM(direction * quantity) FROM public.stock_movements s
               WHERE s.material_id = _material_id AND s.warehouse_id = _warehouse_id
                 AND s.reversed_by IS NULL AND s.movement_type <> 'reversal'), 0),
    COALESCE((SELECT SUM(t.requested_quantity - t.dispatched_quantity) FROM public.inventory_transfers t
               WHERE t.material_id = _material_id AND t.source_warehouse_id = _warehouse_id
                 AND t.status IN ('approved','ready_to_dispatch','partially_dispatched')
                 AND t.requested_quantity > t.dispatched_quantity), 0),
    COALESCE((SELECT SUM(direction * quantity) FROM public.stock_movements s
               WHERE s.material_id = _material_id AND s.warehouse_id = _warehouse_id
                 AND s.reversed_by IS NULL AND s.movement_type <> 'reversal'), 0)
    - COALESCE((SELECT SUM(t.requested_quantity - t.dispatched_quantity) FROM public.inventory_transfers t
               WHERE t.material_id = _material_id AND t.source_warehouse_id = _warehouse_id
                 AND t.status IN ('approved','ready_to_dispatch','partially_dispatched')
                 AND t.requested_quantity > t.dispatched_quantity), 0);
$$;

-- Transfer olay kaydı
CREATE OR REPLACE FUNCTION public.inv_transfer_event(
  _owner uuid, _transfer_id uuid, _status text, _action text, _note text, _payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); eid uuid; nm text;
BEGIN
  SELECT COALESCE(full_name, email) INTO nm FROM public.profiles WHERE user_id = uid;
  INSERT INTO public.inventory_transfer_events (user_id, transfer_id, status, action, actor_id, actor_name, note, payload)
  VALUES (_owner, _transfer_id, _status, _action, uid, nm, _note, COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO eid;
  RETURN eid;
END; $$;

-- Tekrarsız uygulama içi bildirim
CREATE OR REPLACE FUNCTION public.inv_transfer_notify(
  _transfer_id uuid, _event text, _title text, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); t RECORD; rcpt uuid;
BEGIN
  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id;
  IF t.id IS NULL THEN RETURN; END IF;
  FOR rcpt IN
    SELECT DISTINCT x FROM unnest(ARRAY[t.user_id, t.requester_id, t.approver_id, t.dispatcher_id]) AS x
     WHERE x IS NOT NULL AND x <> COALESCE(uid, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO public.notification_history (user_id, title, body, notification_type, click_url, metadata)
    VALUES (rcpt, _title, _body, 'inventory_transfer',
            '/depo/transferler/' || t.id::text,
            jsonb_build_object('dedupe_key', _transfer_id::text || ':' || _event,
                               'transfer_id', t.id, 'transfer_no', t.transfer_no, 'event', _event))
    ON CONFLICT DO NOTHING;
  END LOOP;
END; $$;

-- ─────────────────────────── 1. TALEP OLUŞTUR ───────────────────────────

CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  _source_warehouse_id uuid,
  _dest_warehouse_id uuid,
  _material_id uuid,
  _requested_quantity numeric,
  _unit text DEFAULT NULL,
  _required_at date DEFAULT NULL,
  _reason text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _project_id text DEFAULT NULL,
  _allow_safety_breach boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); owner uuid; m RECORD; src RECORD; dst RECORD;
  factor numeric; qty numeric; pos RECORD; tid uuid; tno text; st text; auto boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.depot_permission('create_transfer') THEN RAISE EXCEPTION 'permission_denied'; END IF;

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
  IF NOT _allow_safety_breach AND COALESCE(m.safety_stock, 0) > 0
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
                       'auto_approved', auto));

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, new_value, reason, source_type, source_id)
  VALUES (owner, uid, 'inventory_transfer', tid, 'create',
          jsonb_build_object('transfer_no', tno, 'quantity', qty, 'status', st), _reason, 'inventory_transfer', tid);

  IF NOT auto THEN
    PERFORM public.inv_transfer_notify(tid, 'approval_requested', 'Transfer onayı bekliyor',
      tno || ' numaralı transfer talebi onayınızı bekliyor.');
  END IF;

  RETURN jsonb_build_object('transfer_id', tid, 'transfer_no', tno, 'status', st);
END; $$;

-- ─────────────────────────── 2. ONAY / RED / REVİZYON ───────────────────────────

CREATE OR REPLACE FUNCTION public.approve_stock_transfer(
  _transfer_id uuid, _decision text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); owner uuid; t RECORD; m RECORD; pos RECORD; st text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.depot_permission('approve_transfer') THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF _decision NOT IN ('approve','reject','request_revision') THEN RAISE EXCEPTION 'invalid_decision'; END IF;

  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'transfer_not_found'; END IF;
  IF NOT public.can_access_team_resource(uid, t.user_id) THEN RAISE EXCEPTION 'cross_company_access'; END IF;
  IF t.status NOT IN ('requested','pending_approval') THEN RAISE EXCEPTION 'invalid_transfer_status'; END IF;

  owner := t.user_id;
  IF t.requester_id = uid AND uid <> owner THEN RAISE EXCEPTION 'self_approval_not_allowed'; END IF;

  IF _decision IN ('reject','request_revision') AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF _decision = 'approve' THEN
    SELECT * INTO m FROM public.materials WHERE id = t.material_id;
    SELECT * INTO pos FROM public.inv_stock_position(t.material_id, t.source_warehouse_id);
    IF t.requested_quantity > pos.available THEN RAISE EXCEPTION 'insufficient_available_stock'; END IF;
    IF COALESCE(m.safety_stock,0) > 0 AND (pos.available - t.requested_quantity) < m.safety_stock THEN
      RAISE EXCEPTION 'safety_stock_violation';
    END IF;
    st := 'approved';
    UPDATE public.inventory_transfers
       SET status = st, approver_id = uid, approved_at = now(), rejection_reason = NULL, updated_at = now()
     WHERE id = _transfer_id;
    PERFORM public.inv_transfer_notify(_transfer_id, 'approved', 'Transfer onaylandı',
      t.transfer_no || ' numaralı transfer onaylandı, sevk edilebilir.');
  ELSIF _decision = 'reject' THEN
    st := 'rejected';
    UPDATE public.inventory_transfers
       SET status = st, approver_id = uid, approved_at = now(), rejection_reason = _reason, updated_at = now()
     WHERE id = _transfer_id;
    PERFORM public.inv_transfer_notify(_transfer_id, 'rejected', 'Transfer reddedildi',
      t.transfer_no || ' numaralı transfer reddedildi: ' || _reason);
  ELSE
    st := 'requested';
    UPDATE public.inventory_transfers
       SET status = st, revision_note = _reason, updated_at = now()
     WHERE id = _transfer_id;
    PERFORM public.inv_transfer_notify(_transfer_id, 'revision_requested', 'Transfer revizyon bekliyor',
      t.transfer_no || ' numaralı transfer için revizyon istendi: ' || _reason);
  END IF;

  PERFORM public.inv_transfer_event(owner, _transfer_id, st, _decision, _reason,
    jsonb_build_object('previous_status', t.status));
  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, previous_value, new_value, reason, source_type, source_id)
  VALUES (owner, uid, 'inventory_transfer', _transfer_id, _decision,
          jsonb_build_object('status', t.status), jsonb_build_object('status', st), _reason, 'inventory_transfer', _transfer_id);

  RETURN jsonb_build_object('transfer_id', _transfer_id, 'status', st);
END; $$;

-- ─────────────────────────── 3. SEVK ───────────────────────────

CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(
  _transfer_id uuid,
  _dispatched_quantity numeric,
  _unit text DEFAULT NULL,
  _dispatched_at timestamptz DEFAULT NULL,
  _expected_arrival_at timestamptz DEFAULT NULL,
  _reference text DEFAULT NULL,
  _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); t RECORD; m RECORD; pos RECORD; factor numeric; qty numeric;
  remaining numeric; cost numeric; eid uuid; mid uuid; st text; when_ts timestamptz;
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
  IF qty > pos.on_hand THEN RAISE EXCEPTION 'insufficient_available_stock'; END IF;

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

-- ─────────────────────────── 4. TESLİM ALMA ───────────────────────────

CREATE OR REPLACE FUNCTION public.receive_stock_transfer(
  _transfer_id uuid,
  _accepted_quantity numeric DEFAULT 0,
  _damaged_quantity numeric DEFAULT 0,
  _missing_quantity numeric DEFAULT 0,
  _rejected_quantity numeric DEFAULT 0,
  _unit text DEFAULT NULL,
  _received_at timestamptz DEFAULT NULL,
  _notes text DEFAULT NULL,
  _reference text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); t RECORD; factor numeric;
  acc numeric; dmg numeric; mis numeric; rej numeric; total numeric;
  eid uuid; mid uuid := NULL; st text; when_ts timestamptz; transit_after numeric; dq numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.depot_permission('receive_transfer') THEN RAISE EXCEPTION 'permission_denied'; END IF;

  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'transfer_not_found'; END IF;
  IF NOT public.can_access_team_resource(uid, t.user_id) THEN RAISE EXCEPTION 'cross_company_access'; END IF;
  IF t.status IN ('cancelled','rejected') THEN RAISE EXCEPTION 'invalid_transfer_status'; END IF;
  IF t.status NOT IN ('in_transit','partially_dispatched','partially_received','discrepancy') THEN
    RAISE EXCEPTION 'invalid_transfer_status';
  END IF;
  IF t.in_transit_quantity <= 0 THEN RAISE EXCEPTION 'quantity_exceeds_transit'; END IF;

  factor := public.inv_unit_factor(t.material_id, COALESCE(_unit, t.unit));
  IF factor IS NULL THEN RAISE EXCEPTION 'invalid_unit'; END IF;

  acc := COALESCE(_accepted_quantity,0) * factor;
  dmg := COALESCE(_damaged_quantity,0) * factor;
  mis := COALESCE(_missing_quantity,0) * factor;
  rej := COALESCE(_rejected_quantity,0) * factor;
  IF acc < 0 OR dmg < 0 OR mis < 0 OR rej < 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  total := acc + dmg + mis + rej;
  IF total <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  IF total > t.in_transit_quantity THEN RAISE EXCEPTION 'quantity_exceeds_transit'; END IF;

  IF _reference IS NOT NULL AND btrim(_reference) <> '' AND EXISTS (
       SELECT 1 FROM public.inventory_transfer_events e
        WHERE e.transfer_id = _transfer_id AND e.action = 'receive'
          AND e.payload->>'reference' = btrim(_reference))
  THEN RAISE EXCEPTION 'receipt_already_processed'; END IF;

  when_ts := COALESCE(_received_at, now());
  transit_after := t.in_transit_quantity - total;
  dq := t.dispatched_quantity;

  st := CASE
          WHEN transit_after > 0 THEN 'partially_received'
          WHEN (dmg + mis + rej + t.damaged_quantity + t.missing_quantity + t.rejected_quantity) > 0 THEN 'discrepancy'
          WHEN (t.received_quantity + acc) < t.requested_quantity THEN 'partially_received'
          ELSE 'received'
        END;

  eid := public.inv_transfer_event(t.user_id, _transfer_id, st, 'receive', _notes,
    jsonb_build_object('accepted', acc, 'damaged', dmg, 'missing', mis, 'rejected', rej,
                       'unit', t.unit, 'reference', NULLIF(btrim(COALESCE(_reference,'')),''),
                       'received_at', when_ts));

  IF acc > 0 THEN
    INSERT INTO public.stock_movements (
      user_id, movement_type, reason, direction, material_id, warehouse_id, counter_warehouse_id,
      quantity, unit, unit_cost, total_cost, project_id, source_type, source_id, source_document,
      notes, actor_id, transaction_date)
    VALUES (t.user_id, 'transfer_in', 'depolar arası transfer teslim alımı', 1, t.material_id,
      t.dest_warehouse_id, t.source_warehouse_id, acc, t.unit, t.unit_cost,
      CASE WHEN t.unit_cost IS NULL THEN NULL ELSE t.unit_cost * acc END, t.project_id,
      'inventory_transfer', eid, t.transfer_no, _notes, uid, when_ts::date)
    RETURNING id INTO mid;

    UPDATE public.inventory_transfer_events
       SET payload = payload || jsonb_build_object('movement_id', mid)
     WHERE id = eid;
  END IF;

  UPDATE public.inventory_transfers
     SET received_quantity = received_quantity + acc,
         damaged_quantity = damaged_quantity + dmg,
         missing_quantity = missing_quantity + mis,
         rejected_quantity = rejected_quantity + rej,
         in_transit_quantity = transit_after,
         receiver_id = uid,
         received_at = when_ts,
         discrepancy_note = CASE WHEN (dmg + mis + rej) > 0
                                 THEN COALESCE(discrepancy_note || E'\n', '') || COALESCE(_notes, 'Uyuşmazlık kaydedildi')
                                 ELSE discrepancy_note END,
         status = st,
         updated_at = now()
   WHERE id = _transfer_id;

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, previous_value, new_value, reason, source_type, source_id)
  VALUES (t.user_id, uid, 'inventory_transfer', _transfer_id, 'receive',
          jsonb_build_object('status', t.status, 'in_transit', t.in_transit_quantity),
          jsonb_build_object('status', st, 'accepted', acc, 'damaged', dmg, 'missing', mis,
                             'rejected', rej, 'in_transit', transit_after, 'movement_id', mid),
          _notes, 'inventory_transfer', _transfer_id);

  PERFORM public.inv_transfer_notify(_transfer_id,
    CASE WHEN st = 'received' THEN 'completed' ELSE st END || '_' || eid::text,
    CASE WHEN st = 'received' THEN 'Transfer tamamlandı'
         WHEN st = 'discrepancy' THEN 'Transferde uyuşmazlık var'
         ELSE 'Transfer kısmen teslim alındı' END,
    t.transfer_no || ' numaralı transfer için teslim kaydı girildi.');

  RETURN jsonb_build_object('transfer_id', _transfer_id, 'status', st, 'movement_id', mid,
                            'in_transit_quantity', transit_after,
                            'received_quantity', t.received_quantity + acc);
END; $$;

-- ─────────────────────────── 5. İPTAL / İADE ───────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_stock_transfer(_transfer_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); t RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'transfer_not_found'; END IF;
  IF NOT public.can_access_team_resource(uid, t.user_id) THEN RAISE EXCEPTION 'cross_company_access'; END IF;
  IF NOT (public.depot_permission('create_transfer') OR public.depot_permission('approve_transfer'))
  THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF t.dispatched_quantity > 0 THEN RAISE EXCEPTION 'transfer_already_dispatched'; END IF;
  IF t.status NOT IN ('requested','pending_approval','approved','ready_to_dispatch') THEN
    RAISE EXCEPTION 'invalid_transfer_status';
  END IF;

  UPDATE public.inventory_transfers
     SET status = 'cancelled', cancelled_by = uid, cancelled_at = now(),
         cancel_reason = _reason, updated_at = now()
   WHERE id = _transfer_id;

  PERFORM public.inv_transfer_event(t.user_id, _transfer_id, 'cancelled', 'cancel', _reason,
    jsonb_build_object('previous_status', t.status));
  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, previous_value, new_value, reason, source_type, source_id)
  VALUES (t.user_id, uid, 'inventory_transfer', _transfer_id, 'cancel',
          jsonb_build_object('status', t.status), jsonb_build_object('status', 'cancelled'),
          _reason, 'inventory_transfer', _transfer_id);

  RETURN jsonb_build_object('transfer_id', _transfer_id, 'status', 'cancelled');
END; $$;

-- Sevk sonrası kontrollü iade: yoldaki miktar kaynağa geri döner,
-- orijinal hareketler korunur, bağlantılı iade hareketi oluşturulur.
CREATE OR REPLACE FUNCTION public.return_stock_transfer(
  _transfer_id uuid, _quantity numeric, _reason text, _unit text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); t RECORD; factor numeric; qty numeric; eid uuid; mid uuid; st text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.depot_permission('approve_transfer') THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO t FROM public.inventory_transfers WHERE id = _transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'transfer_not_found'; END IF;
  IF NOT public.can_access_team_resource(uid, t.user_id) THEN RAISE EXCEPTION 'cross_company_access'; END IF;
  IF t.in_transit_quantity <= 0 THEN RAISE EXCEPTION 'invalid_transfer_status'; END IF;

  factor := public.inv_unit_factor(t.material_id, COALESCE(_unit, t.unit));
  IF factor IS NULL THEN RAISE EXCEPTION 'invalid_unit'; END IF;
  qty := COALESCE(_quantity, 0) * factor;
  IF qty <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  IF qty > t.in_transit_quantity THEN RAISE EXCEPTION 'quantity_exceeds_transit'; END IF;

  st := CASE WHEN (t.in_transit_quantity - qty) > 0 THEN t.status
             WHEN t.received_quantity > 0 THEN 'discrepancy'
             ELSE 'cancelled' END;

  eid := public.inv_transfer_event(t.user_id, _transfer_id, st, 'return', _reason,
    jsonb_build_object('quantity', qty, 'unit', t.unit));

  INSERT INTO public.stock_movements (
    user_id, movement_type, reason, direction, material_id, warehouse_id, counter_warehouse_id,
    quantity, unit, unit_cost, total_cost, project_id, source_type, source_id, source_document,
    notes, actor_id, transaction_date)
  VALUES (t.user_id, 'transfer_in', 'transfer iadesi — kaynak depoya dönüş', 1, t.material_id,
    t.source_warehouse_id, t.dest_warehouse_id, qty, t.unit, t.unit_cost,
    CASE WHEN t.unit_cost IS NULL THEN NULL ELSE t.unit_cost * qty END, t.project_id,
    'inventory_transfer', eid, t.transfer_no, _reason, uid, CURRENT_DATE)
  RETURNING id INTO mid;

  UPDATE public.inventory_transfer_events
     SET payload = payload || jsonb_build_object('movement_id', mid) WHERE id = eid;

  UPDATE public.inventory_transfers
     SET in_transit_quantity = in_transit_quantity - qty,
         dispatched_quantity = GREATEST(dispatched_quantity - qty, 0),
         status = st, cancel_reason = COALESCE(cancel_reason, _reason), updated_at = now()
   WHERE id = _transfer_id;

  INSERT INTO public.inventory_audit_log (user_id, actor_id, entity_type, entity_id, action, previous_value, new_value, reason, source_type, source_id)
  VALUES (t.user_id, uid, 'inventory_transfer', _transfer_id, 'return',
          jsonb_build_object('status', t.status, 'in_transit', t.in_transit_quantity),
          jsonb_build_object('status', st, 'returned', qty, 'movement_id', mid),
          _reason, 'inventory_transfer', _transfer_id);

  RETURN jsonb_build_object('transfer_id', _transfer_id, 'status', st, 'movement_id', mid,
                            'in_transit_quantity', t.in_transit_quantity - qty);
END; $$;

GRANT EXECUTE ON FUNCTION public.inv_unit_factor(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inv_stock_position(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer(uuid, uuid, uuid, numeric, text, date, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_stock_transfer(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_stock_transfer(uuid, numeric, text, timestamptz, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_stock_transfer(uuid, numeric, numeric, numeric, numeric, text, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_stock_transfer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_stock_transfer(uuid, numeric, text, text) TO authenticated;