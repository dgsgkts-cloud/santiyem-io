-- ============================================================
-- 1) THRESHOLD CONFIG (Rule G)
-- ============================================================
ALTER TABLE public.risk_thresholds
  ADD COLUMN IF NOT EXISTS minimum_cost_code_count integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS minimum_profit_erosion_amount numeric NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS require_progress_record boolean NOT NULL DEFAULT true;

-- ============================================================
-- 2) COST CODE RESOLUTION HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.pi_resolve_cost_code(_project_id text, _code text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id FROM public.cost_codes c
  WHERE c.project_id = _project_id
    AND c.is_active
    AND _code IS NOT NULL
    AND lower(btrim(c.code)) = lower(btrim(_code))
  ORDER BY c.created_at
  LIMIT 1;
$$;

-- ============================================================
-- 3) COST CODE FINANCIALS  (+ has_progress, + virtual uncoded row)
-- ============================================================
DROP FUNCTION IF EXISTS public.cost_code_financials(text);
CREATE FUNCTION public.cost_code_financials(_project_id text)
RETURNS TABLE(
  cost_code_id uuid, code text, name text, parent_id uuid, unit text,
  original_budget numeric, budget_unit_price numeric, actual_cost numeric,
  latest_unit_price numeric, committed_total numeric, remaining_committed numeric,
  progress_percent numeric, consumed_budget_percent numeric, etc numeric,
  etc_is_manual boolean, uncommitted_remaining_forecast numeric, eac numeric,
  budget_variance numeric, has_progress boolean, is_uncoded boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH cc AS (
    SELECT c.* FROM public.cost_codes c
    WHERE c.project_id = _project_id AND c.is_active
  ),
  b AS (
    SELECT cost_code_id, COALESCE(original_budget_amount,0) AS budget,
           COALESCE(budget_unit_price,0) AS unit_price
    FROM public.cost_code_budgets WHERE project_id = _project_id
  ),
  a AS (
    SELECT ca.cost_code_id, SUM(COALESCE(ca.total_amount,0)) AS actual
    FROM public.cost_actuals ca
    WHERE ca.project_id = _project_id AND ca.cost_code_id IS NOT NULL
    GROUP BY ca.cost_code_id
  ),
  last_price AS (
    SELECT DISTINCT ON (ca.cost_code_id) ca.cost_code_id, ca.unit_price
    FROM public.cost_actuals ca
    WHERE ca.project_id = _project_id AND ca.cost_code_id IS NOT NULL AND ca.unit_price IS NOT NULL
    ORDER BY ca.cost_code_id, ca.cost_date DESC, ca.created_at DESC
  ),
  cm AS (
    SELECT co.cost_code_id,
           SUM(COALESCE(co.original_committed_amount,0)) AS committed,
           SUM(CASE WHEN co.status IN ('cancelled') THEN 0
                    ELSE COALESCE(co.remaining_committed_amount,0) END) AS remaining
    FROM public.cost_commitments co
    WHERE co.project_id = _project_id AND co.cost_code_id IS NOT NULL
    GROUP BY co.cost_code_id
  ),
  pr AS (
    SELECT DISTINCT ON (p.cost_code_id) p.cost_code_id, p.progress_percent
    FROM public.cost_code_progress p
    WHERE p.project_id = _project_id
    ORDER BY p.cost_code_id, p.measurement_date DESC, p.created_at DESC
  ),
  fc AS (
    SELECT DISTINCT ON (f.cost_code_id) f.cost_code_id,
           COALESCE(f.manual_etc, f.calculated_etc) AS etc_value, f.is_manual
    FROM public.cost_code_forecasts f
    WHERE f.project_id = _project_id
    ORDER BY f.cost_code_id, f.forecast_date DESC, f.created_at DESC
  ),
  coded AS (
    SELECT
      cc.id AS cost_code_id, cc.code, cc.name, cc.parent_id, cc.unit,
      COALESCE(b.budget,0) AS original_budget,
      COALESCE(b.unit_price,0) AS budget_unit_price,
      COALESCE(a.actual,0) AS actual_cost,
      last_price.unit_price AS latest_unit_price,
      COALESCE(cm.committed,0) AS committed_total,
      COALESCE(cm.remaining,0) AS remaining_committed,
      COALESCE(pr.progress_percent,0) AS progress_percent,
      CASE WHEN COALESCE(b.budget,0) > 0
           THEN COALESCE(a.actual,0) / b.budget * 100 ELSE 0 END AS consumed_budget_percent,
      etc.v AS etc,
      COALESCE(fc.is_manual,false) AS etc_is_manual,
      GREATEST(etc.v - COALESCE(cm.remaining,0), 0) AS uncommitted_remaining_forecast,
      COALESCE(a.actual,0) + COALESCE(cm.remaining,0) + GREATEST(etc.v - COALESCE(cm.remaining,0), 0) AS eac,
      (COALESCE(a.actual,0) + COALESCE(cm.remaining,0) + GREATEST(etc.v - COALESCE(cm.remaining,0), 0))
        - COALESCE(b.budget,0) AS budget_variance,
      (pr.cost_code_id IS NOT NULL) AS has_progress,
      false AS is_uncoded
    FROM cc
    LEFT JOIN b ON b.cost_code_id = cc.id
    LEFT JOIN a ON a.cost_code_id = cc.id
    LEFT JOIN last_price ON last_price.cost_code_id = cc.id
    LEFT JOIN cm ON cm.cost_code_id = cc.id
    LEFT JOIN pr ON pr.cost_code_id = cc.id
    LEFT JOIN fc ON fc.cost_code_id = cc.id
    CROSS JOIN LATERAL (
      SELECT COALESCE(
        fc.etc_value,
        GREATEST(
          COALESCE(b.budget,0) * (1 - COALESCE(pr.progress_percent,0)/100),
          COALESCE(cm.remaining,0)
        )
      ) AS v
    ) etc
  ),
  un AS (
    SELECT
      (SELECT COALESCE(SUM(total_amount),0) FROM public.cost_actuals
        WHERE project_id = _project_id AND cost_code_id IS NULL) AS actual,
      (SELECT COALESCE(SUM(original_committed_amount),0) FROM public.cost_commitments
        WHERE project_id = _project_id AND cost_code_id IS NULL AND status <> 'cancelled') AS committed,
      (SELECT COALESCE(SUM(remaining_committed_amount),0) FROM public.cost_commitments
        WHERE project_id = _project_id AND cost_code_id IS NULL AND status <> 'cancelled') AS remaining
  ),
  uncoded_row AS (
    SELECT
      NULL::uuid, 'ZZ'::text, 'Kodlanmamış Maliyet'::text, NULL::uuid, NULL::text,
      0::numeric, 0::numeric, un.actual, NULL::numeric, un.committed, un.remaining,
      0::numeric, 0::numeric, un.remaining, false,
      0::numeric,
      un.actual + un.remaining,
      un.actual + un.remaining,
      false, true
    FROM un
    WHERE un.actual <> 0 OR un.committed <> 0 OR un.remaining <> 0
  )
  SELECT * FROM coded
  UNION ALL
  SELECT * FROM uncoded_row
  ORDER BY is_uncoded, code;
$function$;

-- project_financials: now sums all rows (uncoded row included), no separate add-on
CREATE OR REPLACE FUNCTION public.project_financials(_project_id text)
RETURNS TABLE(project_id text, original_revenue numeric, forecast_revenue numeric,
  original_budget numeric, actual_cost numeric, committed_cost numeric,
  remaining_committed_cost numeric, etc numeric, eac numeric,
  original_expected_profit numeric, forecast_final_profit numeric, profit_erosion numeric,
  forecast_margin_percent numeric, budget_variance numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH p AS (
    SELECT pj.id, COALESCE(pj.original_revenue, pj.contract_amount, 0) AS orig_rev,
           COALESCE(pj.forecast_revenue, pj.original_revenue, pj.contract_amount, 0) AS fc_rev
    FROM public.projects pj WHERE pj.id::text = _project_id
  ),
  agg AS (
    SELECT COALESCE(SUM(original_budget),0) AS budget,
           COALESCE(SUM(actual_cost),0) AS actual,
           COALESCE(SUM(committed_total),0) AS committed,
           COALESCE(SUM(remaining_committed),0) AS remaining_committed,
           COALESCE(SUM(etc),0) AS etc,
           COALESCE(SUM(eac),0) AS eac
    FROM public.cost_code_financials(_project_id)
  )
  SELECT
    _project_id,
    COALESCE((SELECT orig_rev FROM p),0),
    COALESCE((SELECT fc_rev FROM p),0),
    agg.budget,
    agg.actual,
    agg.committed,
    agg.remaining_committed,
    agg.etc,
    agg.eac,
    COALESCE((SELECT orig_rev FROM p),0) - agg.budget,
    COALESCE((SELECT fc_rev FROM p),0) - agg.eac,
    (COALESCE((SELECT orig_rev FROM p),0) - agg.budget)
      - (COALESCE((SELECT fc_rev FROM p),0) - agg.eac),
    CASE WHEN COALESCE((SELECT fc_rev FROM p),0) > 0
      THEN (COALESCE((SELECT fc_rev FROM p),0) - agg.eac) / (SELECT fc_rev FROM p) * 100
      ELSE 0 END,
    agg.eac - agg.budget
  FROM agg;
$function$;

-- ============================================================
-- 4) SYNC: project_expenses -> cost_actuals
--    Expenses derived from other modules are skipped (no double counting).
-- ============================================================
CREATE OR REPLACE FUNCTION public.pi_sync_project_expense(_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE e record; cc uuid; ctype text;
BEGIN
  SELECT * INTO e FROM public.project_expenses WHERE id = _expense_id;
  IF e.id IS NULL
     OR e.project_id IS NULL
     OR COALESCE(e.source,'manual') IN ('purchase_order','subcontractor') THEN
    DELETE FROM public.cost_actuals
      WHERE source_type = 'project_expense' AND source_id = _expense_id;
    RETURN;
  END IF;

  cc := public.pi_resolve_cost_code(e.project_id, e.category);
  ctype := CASE
    WHEN e.category IN ('Malzeme') THEN 'material'
    WHEN e.category IN ('İşçilik','Personel') THEN 'labor'
    WHEN e.category IN ('Taşeron') THEN 'subcontractor'
    ELSE 'other' END;

  INSERT INTO public.cost_actuals (user_id, project_id, cost_code_id, vendor_name, cost_date,
    total_amount, cost_type, source_type, source_id, description)
  VALUES (e.user_id, e.project_id, cc, NULL, e.expense_date,
    COALESCE(e.amount,0), ctype, 'project_expense', e.id,
    COALESCE(e.description, e.category))
  ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO UPDATE
    SET project_id = EXCLUDED.project_id,
        cost_code_id = EXCLUDED.cost_code_id,
        cost_date = EXCLUDED.cost_date,
        total_amount = EXCLUDED.total_amount,
        cost_type = EXCLUDED.cost_type,
        description = EXCLUDED.description,
        updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.pi_trg_project_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cost_actuals
      WHERE source_type = 'project_expense' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  PERFORM public.pi_sync_project_expense(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pi_sync_expense ON public.project_expenses;
CREATE TRIGGER pi_sync_expense
AFTER INSERT OR UPDATE OR DELETE ON public.project_expenses
FOR EACH ROW EXECUTE FUNCTION public.pi_trg_project_expense();

-- ============================================================
-- 5) SYNC: subcontractor_payments -> cost_actuals (only realized)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pi_sync_subcontractor_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sp record; vendor text;
BEGIN
  SELECT * INTO sp FROM public.subcontractor_payments WHERE id = _payment_id;
  IF sp.id IS NULL OR sp.project_id IS NULL
     OR COALESCE(sp.status,'') NOT IN ('odendi','paid') THEN
    DELETE FROM public.cost_actuals
      WHERE source_type = 'subcontractor_payment' AND source_id = _payment_id;
    RETURN;
  END IF;

  SELECT s.name INTO vendor FROM public.subcontractors s WHERE s.id = sp.subcontractor_id;

  INSERT INTO public.cost_actuals (user_id, project_id, cost_code_id, vendor_name, cost_date,
    total_amount, cost_type, source_type, source_id, description)
  VALUES (sp.user_id, sp.project_id, NULL, vendor,
    COALESCE(sp.payment_date, sp.planned_date, CURRENT_DATE),
    COALESCE(sp.amount,0), 'subcontractor', 'subcontractor_payment', sp.id,
    COALESCE(sp.description, 'Taşeron ödemesi'))
  ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO UPDATE
    SET project_id = EXCLUDED.project_id,
        vendor_name = EXCLUDED.vendor_name,
        cost_date = EXCLUDED.cost_date,
        total_amount = EXCLUDED.total_amount,
        description = EXCLUDED.description,
        updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.pi_trg_subcontractor_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cost_actuals
      WHERE source_type = 'subcontractor_payment' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  PERFORM public.pi_sync_subcontractor_payment(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pi_sync_subpay ON public.subcontractor_payments;
CREATE TRIGGER pi_sync_subpay
AFTER INSERT OR UPDATE OR DELETE ON public.subcontractor_payments
FOR EACH ROW EXECUTE FUNCTION public.pi_trg_subcontractor_payment();

-- ============================================================
-- 6) SYNC: purchase_orders -> cost_commitments (one per order)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pi_sync_purchase_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE po record; net numeric; cc uuid; distinct_codes integer; single_code text;
        cancelled boolean; new_status text; existing_actualized numeric;
BEGIN
  SELECT * INTO po FROM public.purchase_orders WHERE id = _order_id;
  IF po.id IS NULL OR po.project_id IS NULL THEN
    DELETE FROM public.cost_commitments
      WHERE source_type = 'purchase_order' AND source_id = _order_id;
    RETURN;
  END IF;

  -- Draft / rejected orders are not commitments yet
  IF COALESCE(po.order_status,'') IN ('Taslak','Reddedildi') THEN
    DELETE FROM public.cost_commitments
      WHERE source_type = 'purchase_order' AND source_id = _order_id;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(COALESCE(i.line_total, i.quantity * i.unit_price)),0),
         COUNT(DISTINCT NULLIF(btrim(i.cost_code),'')),
         MIN(NULLIF(btrim(i.cost_code),''))
    INTO net, distinct_codes, single_code
  FROM public.purchase_order_items i WHERE i.order_id = po.id;

  IF COALESCE(net,0) = 0 THEN net := COALESCE(po.subtotal, po.total, 0); END IF;
  IF distinct_codes = 1 THEN cc := public.pi_resolve_cost_code(po.project_id, single_code); END IF;

  cancelled := po.cancelled_at IS NOT NULL
               OR COALESCE(po.order_status,'') IN ('İptal','İptal Edildi','İptal edildi');

  SELECT COALESCE(actualized_amount,0) INTO existing_actualized
  FROM public.cost_commitments
  WHERE source_type = 'purchase_order' AND source_id = po.id;

  new_status := CASE
    WHEN cancelled THEN 'cancelled'
    WHEN COALESCE(existing_actualized,0) >= net AND net > 0 THEN 'closed'
    ELSE 'open' END;

  INSERT INTO public.cost_commitments (user_id, project_id, cost_code_id, commitment_type,
    vendor_name, reference_no, original_committed_amount, actualized_amount, status,
    commitment_date, source_type, source_id, notes)
  VALUES (po.user_id, po.project_id, cc, 'purchase_order', po.supplier_name, po.order_no,
    CASE WHEN cancelled THEN 0 ELSE net END, 0, new_status,
    COALESCE(po.order_date, CURRENT_DATE), 'purchase_order', po.id, po.notes)
  ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO UPDATE
    SET project_id = EXCLUDED.project_id,
        cost_code_id = EXCLUDED.cost_code_id,
        vendor_name = EXCLUDED.vendor_name,
        reference_no = EXCLUDED.reference_no,
        original_committed_amount = EXCLUDED.original_committed_amount,
        status = new_status,
        commitment_date = EXCLUDED.commitment_date,
        updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.pi_trg_purchase_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cost_commitments
      WHERE source_type = 'purchase_order' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  PERFORM public.pi_sync_purchase_order(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pi_sync_po ON public.purchase_orders;
CREATE TRIGGER pi_sync_po
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.pi_trg_purchase_order();

CREATE OR REPLACE FUNCTION public.pi_trg_purchase_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.pi_sync_purchase_order(COALESCE(NEW.order_id, OLD.order_id));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS pi_sync_po_item ON public.purchase_order_items;
CREATE TRIGGER pi_sync_po_item
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
FOR EACH ROW EXECUTE FUNCTION public.pi_trg_purchase_order_item();

-- ============================================================
-- 7) SYNC: purchase_order_invoices -> cost_actuals (actualizes the commitment)
--    Payments are cash movements, never a second actual cost.
-- ============================================================
CREATE OR REPLACE FUNCTION public.pi_sync_purchase_invoice(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inv record; po record; com record; net numeric;
BEGIN
  SELECT * INTO inv FROM public.purchase_order_invoices WHERE id = _invoice_id;
  IF inv.id IS NULL OR COALESCE(inv.status,'') IN ('İptal','İptal Edildi') THEN
    DELETE FROM public.cost_actuals
      WHERE source_type = 'purchase_order_invoice' AND source_id = _invoice_id;
    RETURN;
  END IF;

  SELECT * INTO po FROM public.purchase_orders WHERE id = inv.order_id;
  IF po.id IS NULL OR po.project_id IS NULL THEN
    DELETE FROM public.cost_actuals
      WHERE source_type = 'purchase_order_invoice' AND source_id = _invoice_id;
    RETURN;
  END IF;

  SELECT * INTO com FROM public.cost_commitments
   WHERE source_type = 'purchase_order' AND source_id = po.id;

  net := COALESCE(NULLIF(inv.subtotal,0), inv.total, 0);

  INSERT INTO public.cost_actuals (user_id, project_id, cost_code_id, vendor_name, cost_date,
    total_amount, cost_type, source_type, source_id, commitment_id, description)
  VALUES (po.user_id, po.project_id, com.cost_code_id, po.supplier_name,
    COALESCE(inv.invoice_date, CURRENT_DATE), net, 'material',
    'purchase_order_invoice', inv.id, com.id,
    COALESCE('Fatura ' || inv.invoice_no, 'Satın alma faturası'))
  ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO UPDATE
    SET project_id = EXCLUDED.project_id,
        cost_code_id = EXCLUDED.cost_code_id,
        vendor_name = EXCLUDED.vendor_name,
        cost_date = EXCLUDED.cost_date,
        total_amount = EXCLUDED.total_amount,
        commitment_id = EXCLUDED.commitment_id,
        description = EXCLUDED.description,
        updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.pi_trg_purchase_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cost_actuals
      WHERE source_type = 'purchase_order_invoice' AND source_id = OLD.id;
    RETURN OLD;
  END IF;
  PERFORM public.pi_sync_purchase_invoice(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pi_sync_po_invoice ON public.purchase_order_invoices;
CREATE TRIGGER pi_sync_po_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_invoices
FOR EACH ROW EXECUTE FUNCTION public.pi_trg_purchase_invoice();

-- ============================================================
-- 8) RISK ENGINE FIXES (rule C: progress data required, rule G: config gates)
-- ============================================================
CREATE OR REPLACE FUNCTION public.detect_project_risks(_project_id text)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  owner uuid; th public.risk_thresholds; pf record; prev record;
  inserted integer := 0; total_erosion numeric; r record;
  meaningful_codes integer;
BEGIN
  SELECT user_id INTO owner FROM public.projects WHERE id::text = _project_id;
  IF owner IS NULL THEN RETURN 0; END IF;
  th := public.effective_risk_thresholds(owner);
  SELECT * INTO pf FROM public.project_financials(_project_id);

  DELETE FROM public.project_risks
   WHERE project_id = _project_id AND source_type = 'rule_engine' AND status = 'open';

  FOR r IN SELECT * FROM public.cost_code_financials(_project_id) WHERE NOT is_uncoded LOOP
    -- A) EAC budget overrun
    IF r.original_budget > 0 AND r.eac > r.original_budget * (1 + th.eac_overrun_pct/100) THEN
      INSERT INTO public.project_risks (user_id, project_id, cost_code_id, risk_type, severity, title,
        description, financial_impact, recommended_action, metadata)
      VALUES (owner, _project_id, r.cost_code_id, 'eac_budget_overrun',
        CASE WHEN r.eac > r.original_budget * 1.15 THEN 'critical'
             WHEN r.eac > r.original_budget * 1.05 THEN 'high' ELSE 'medium' END,
        r.code || ' ' || r.name || ' bütçe aşımı öngörülüyor',
        'Tahmini toplam maliyet (EAC) orijinal bütçenin üzerinde.',
        r.eac - r.original_budget,
        'Bütçe revizyonu veya maliyet azaltıcı aksiyon planla.',
        jsonb_build_object('eac', r.eac, 'budget', r.original_budget));
      inserted := inserted + 1;
    END IF;

    -- B) Unit price variance
    IF r.budget_unit_price > 0 AND r.latest_unit_price IS NOT NULL
       AND r.latest_unit_price > r.budget_unit_price * (1 + th.unit_price_variance_pct/100) THEN
      INSERT INTO public.project_risks (user_id, project_id, cost_code_id, risk_type, severity, title,
        description, financial_impact, recommended_action, metadata)
      VALUES (owner, _project_id, r.cost_code_id, 'unit_price_variance', 'medium',
        r.code || ' birim fiyat sapması',
        'Son gerçekleşen birim fiyat, bütçe birim fiyatının üzerinde.',
        GREATEST((r.latest_unit_price - r.budget_unit_price) * NULLIF(r.original_budget,0) / NULLIF(r.budget_unit_price,0), 0),
        'Tedarikçi fiyatlarını gözden geçir veya bütçe birim fiyatını güncelle.',
        jsonb_build_object('latest_unit_price', r.latest_unit_price, 'budget_unit_price', r.budget_unit_price));
      inserted := inserted + 1;
    END IF;

    -- C) Cost vs progress mismatch (ONLY with a real progress record)
    IF r.original_budget > 0
       AND (r.has_progress OR NOT th.require_progress_record)
       AND r.consumed_budget_percent - r.progress_percent > th.cost_progress_gap_pct THEN
      INSERT INTO public.project_risks (user_id, project_id, cost_code_id, risk_type, severity, title,
        description, financial_impact, recommended_action, metadata)
      VALUES (owner, _project_id, r.cost_code_id, 'cost_progress_mismatch',
        CASE WHEN r.consumed_budget_percent - r.progress_percent > 30 THEN 'high' ELSE 'medium' END,
        r.code || ' maliyet ilerlemenin önünde',
        'Harcanan bütçe yüzdesi, fiziki ilerleme yüzdesinin belirgin şekilde üzerinde.',
        r.original_budget * ((r.consumed_budget_percent - r.progress_percent)/100),
        'Saha ilerlemesini ve maliyet kayıtlarını doğrula.',
        jsonb_build_object('consumed_pct', r.consumed_budget_percent, 'progress_pct', r.progress_percent));
      inserted := inserted + 1;
    END IF;

    -- E) Commitment over/near budget
    IF r.original_budget > 0
       AND (r.actual_cost + r.remaining_committed) >= r.original_budget * (th.commitment_budget_pct/100) THEN
      INSERT INTO public.project_risks (user_id, project_id, cost_code_id, risk_type, severity, title,
        description, financial_impact, recommended_action, metadata)
      VALUES (owner, _project_id, r.cost_code_id, 'commitment_over_budget',
        CASE WHEN (r.actual_cost + r.remaining_committed) > r.original_budget THEN 'high' ELSE 'medium' END,
        r.code || ' taahhüt bütçe sınırında',
        'Gerçekleşen + kalan taahhüt tutarı bütçeye tehlikeli şekilde yaklaştı veya aştı.',
        GREATEST((r.actual_cost + r.remaining_committed) - r.original_budget, 0),
        'Yeni sipariş/sözleşme öncesi bütçe onayı al.',
        jsonb_build_object('actual', r.actual_cost, 'remaining_committed', r.remaining_committed, 'budget', r.original_budget));
      inserted := inserted + 1;
    END IF;
  END LOOP;

  SELECT * INTO prev FROM public.project_forecast_snapshots
   WHERE project_id = _project_id
     AND snapshot_date <= CURRENT_DATE - th.snapshot_lookback_days
   ORDER BY snapshot_date DESC LIMIT 1;
  IF prev IS NULL THEN
    SELECT * INTO prev FROM public.project_forecast_snapshots
     WHERE project_id = _project_id AND snapshot_date < CURRENT_DATE
     ORDER BY snapshot_date ASC LIMIT 1;
  END IF;

  IF prev.id IS NOT NULL THEN
    -- D) Forecast profit drop
    IF prev.forecast_profit - pf.forecast_final_profit >= th.forecast_profit_drop_amount
       OR (prev.forecast_profit > 0 AND
           (prev.forecast_profit - pf.forecast_final_profit) / prev.forecast_profit * 100 >= th.forecast_profit_drop_pct) THEN
      INSERT INTO public.project_risks (user_id, project_id, risk_type, severity, title, description,
        financial_impact, recommended_action, metadata)
      VALUES (owner, _project_id, 'forecast_profit_drop', 'critical',
        'Tahmini final kâr düştü',
        'Önceki tahmin dönemine göre tahmini final kâr anlamlı şekilde geriledi.',
        prev.forecast_profit - pf.forecast_final_profit,
        'Kâr erozyonunun kaynağı olan maliyet kodlarını incele.',
        jsonb_build_object('previous_profit', prev.forecast_profit, 'current_profit', pf.forecast_final_profit,
                           'since', prev.snapshot_date));
      inserted := inserted + 1;
    END IF;

    -- F) ETC increase
    IF prev.etc > 0 AND (pf.etc - prev.etc) / prev.etc * 100 >= th.etc_increase_pct THEN
      INSERT INTO public.project_risks (user_id, project_id, risk_type, severity, title, description,
        financial_impact, recommended_action, metadata)
      VALUES (owner, _project_id, 'etc_increase', 'high',
        'Kalan iş maliyeti tahmini (ETC) hızlı arttı',
        'ETC, önceki tahmin dönemine göre eşik değerin üzerinde arttı.',
        pf.etc - prev.etc,
        'Kalan miktar ve birim maliyet tahminlerini doğrula.',
        jsonb_build_object('previous_etc', prev.etc, 'current_etc', pf.etc, 'since', prev.snapshot_date));
      inserted := inserted + 1;
    END IF;
  END IF;

  -- G) Profit concentration (needs enough cost codes and material erosion)
  SELECT COUNT(*) INTO meaningful_codes
    FROM public.cost_code_financials(_project_id)
   WHERE NOT is_uncoded AND (original_budget > 0 OR actual_cost > 0);

  SELECT NULLIF(SUM(GREATEST(budget_variance,0)),0) INTO total_erosion
    FROM public.cost_code_financials(_project_id) WHERE NOT is_uncoded;

  IF total_erosion IS NOT NULL
     AND meaningful_codes >= th.minimum_cost_code_count
     AND total_erosion >= th.minimum_profit_erosion_amount THEN
    FOR r IN SELECT * FROM public.cost_code_financials(_project_id) WHERE NOT is_uncoded LOOP
      IF GREATEST(r.budget_variance,0) / total_erosion * 100 >= th.profit_concentration_pct THEN
        INSERT INTO public.project_risks (user_id, project_id, cost_code_id, risk_type, severity, title,
          description, financial_impact, recommended_action, metadata)
        VALUES (owner, _project_id, r.cost_code_id, 'profit_concentration', 'high',
          r.code || ' kâr erozyonunun büyük kısmını oluşturuyor',
          'Bu maliyet kodu projedeki toplam kâr erozyonunun yüksek bir yüzdesini oluşturuyor.',
          GREATEST(r.budget_variance,0),
          'Bu kalemi öncelikli aksiyon listesine al.',
          jsonb_build_object('share_pct', ROUND(GREATEST(r.budget_variance,0)/total_erosion*100, 2)));
        inserted := inserted + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN inserted;
END $function$;

-- ============================================================
-- 9) IDEMPOTENT BACKFILL
-- ============================================================
CREATE OR REPLACE FUNCTION public.pi_backfill_all()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; n_exp integer := 0; n_sub integer := 0; n_po integer := 0; n_inv integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.project_expenses LOOP
    PERFORM public.pi_sync_project_expense(r.id); n_exp := n_exp + 1;
  END LOOP;
  FOR r IN SELECT id FROM public.subcontractor_payments LOOP
    PERFORM public.pi_sync_subcontractor_payment(r.id); n_sub := n_sub + 1;
  END LOOP;
  FOR r IN SELECT id FROM public.purchase_orders LOOP
    PERFORM public.pi_sync_purchase_order(r.id); n_po := n_po + 1;
  END LOOP;
  FOR r IN SELECT id FROM public.purchase_order_invoices LOOP
    PERFORM public.pi_sync_purchase_invoice(r.id); n_inv := n_inv + 1;
  END LOOP;
  RETURN jsonb_build_object('expenses', n_exp, 'subcontractor_payments', n_sub,
                            'purchase_orders', n_po, 'purchase_invoices', n_inv);
END $$;

-- ============================================================
-- 10) RECONCILIATION (read-only report)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reconcile_project_financial_sources(_project_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE src_exp numeric; pi_exp numeric; miss_exp integer;
        src_sub numeric; pi_sub numeric; miss_sub integer;
        src_po numeric; pi_po numeric; miss_po integer;
        src_inv numeric; pi_inv numeric; dup integer; pf record;
BEGIN
  SELECT COALESCE(SUM(amount),0), COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM public.cost_actuals ca
       WHERE ca.source_type='project_expense' AND ca.source_id = e.id))
    INTO src_exp, miss_exp
  FROM public.project_expenses e
  WHERE e.project_id = _project_id AND COALESCE(e.source,'manual') NOT IN ('purchase_order','subcontractor');

  SELECT COALESCE(SUM(total_amount),0) INTO pi_exp FROM public.cost_actuals
   WHERE project_id = _project_id AND source_type='project_expense';

  SELECT COALESCE(SUM(amount),0), COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM public.cost_actuals ca
       WHERE ca.source_type='subcontractor_payment' AND ca.source_id = sp.id))
    INTO src_sub, miss_sub
  FROM public.subcontractor_payments sp
  WHERE sp.project_id = _project_id AND COALESCE(sp.status,'') IN ('odendi','paid');

  SELECT COALESCE(SUM(total_amount),0) INTO pi_sub FROM public.cost_actuals
   WHERE project_id = _project_id AND source_type='subcontractor_payment';

  SELECT COALESCE(SUM(COALESCE(po.subtotal, po.total, 0)),0), COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM public.cost_commitments co
       WHERE co.source_type='purchase_order' AND co.source_id = po.id))
    INTO src_po, miss_po
  FROM public.purchase_orders po
  WHERE po.project_id = _project_id
    AND COALESCE(po.order_status,'') NOT IN ('Taslak','Reddedildi');

  SELECT COALESCE(SUM(original_committed_amount),0) INTO pi_po FROM public.cost_commitments
   WHERE project_id = _project_id AND source_type='purchase_order';

  SELECT COALESCE(SUM(COALESCE(NULLIF(inv.subtotal,0), inv.total, 0)),0) INTO src_inv
  FROM public.purchase_order_invoices inv
  JOIN public.purchase_orders po ON po.id = inv.order_id
  WHERE po.project_id = _project_id AND COALESCE(inv.status,'') NOT IN ('İptal','İptal Edildi');

  SELECT COALESCE(SUM(total_amount),0) INTO pi_inv FROM public.cost_actuals
   WHERE project_id = _project_id AND source_type='purchase_order_invoice';

  SELECT COUNT(*) INTO dup FROM (
    SELECT source_type, source_id FROM public.cost_actuals
     WHERE project_id = _project_id AND source_id IS NOT NULL
     GROUP BY 1,2 HAVING COUNT(*) > 1) d;

  SELECT * INTO pf FROM public.project_financials(_project_id);

  RETURN jsonb_build_object(
    'project_id', _project_id,
    'expenses', jsonb_build_object('source_total', src_exp, 'pi_total', pi_exp,
                                   'missing', miss_exp, 'balanced', src_exp = pi_exp),
    'subcontractor_payments', jsonb_build_object('source_total', src_sub, 'pi_total', pi_sub,
                                   'missing', miss_sub, 'balanced', src_sub = pi_sub),
    'purchase_orders', jsonb_build_object('source_total', src_po, 'pi_committed', pi_po,
                                   'missing', miss_po),
    'purchase_invoices', jsonb_build_object('source_total', src_inv, 'pi_total', pi_inv,
                                   'balanced', src_inv = pi_inv),
    'duplicates', dup,
    'project_totals', jsonb_build_object('actual_cost', pf.actual_cost,
                                   'remaining_committed', pf.remaining_committed_cost,
                                   'eac', pf.eac)
  );
END $$;

REVOKE ALL ON FUNCTION public.pi_backfill_all() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_project_financial_sources(text) TO authenticated;

-- run the backfill once (idempotent)
SELECT public.pi_backfill_all();
