-- =====================================================================
-- PROFIT INTELLIGENCE — PROJECT SETUP (ONBOARDING) SUPPORT
-- Additive only. No existing table, column or data is altered/removed.
-- =====================================================================

-- ---------- 1) Setup summary (read-only, RLS enforced) ----------
CREATE OR REPLACE FUNCTION public.pi_project_setup_summary(_project_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH p AS (
    SELECT pj.id::text AS id, pj.name, pj.original_revenue, pj.forecast_revenue,
           pj.contract_amount
    FROM public.projects pj
    WHERE pj.id::text = _project_id
  ),
  f AS (SELECT * FROM public.project_financials(_project_id)),
  a AS (
    SELECT
      COALESCE(SUM(total_amount),0) AS actual_total,
      COALESCE(SUM(CASE WHEN cost_type = 'subcontractor' THEN total_amount ELSE 0 END),0) AS subcontractor_total,
      COALESCE(SUM(CASE WHEN source_type = 'project_expense' THEN total_amount ELSE 0 END),0) AS expense_total,
      COALESCE(SUM(CASE WHEN source_type IN ('purchase_order_invoice','purchase_invoice') THEN total_amount ELSE 0 END),0) AS invoice_total
    FROM public.cost_actuals WHERE project_id = _project_id
  ),
  bc AS (
    SELECT COUNT(*) AS budget_item_count
    FROM public.cost_code_budgets b
    WHERE b.project_id = _project_id AND COALESCE(b.original_budget_amount,0) > 0
  )
  SELECT jsonb_build_object(
    'project_id', (SELECT id FROM p),
    'project_name', (SELECT name FROM p),
    'original_revenue', (SELECT original_revenue FROM p),
    'forecast_revenue', (SELECT forecast_revenue FROM p),
    'contract_amount', (SELECT contract_amount FROM p),
    'total_budget', COALESCE((SELECT original_budget FROM f),0),
    'actual_cost', COALESCE((SELECT actual_total FROM a),0),
    'expense_cost', COALESCE((SELECT expense_total FROM a),0),
    'invoice_cost', COALESCE((SELECT invoice_total FROM a),0),
    'subcontractor_cost', COALESCE((SELECT subcontractor_total FROM a),0),
    'open_commitments', COALESCE((SELECT remaining_committed_cost FROM f),0),
    'budget_item_count', COALESCE((SELECT budget_item_count FROM bc),0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.pi_project_setup_summary(text) TO authenticated;

-- ---------- 2) Budget setup / refinement (idempotent) ----------
-- _items: [{code, name, amount, quantity, unit, unit_price, parent_code}]
-- Any budget left over after the itemised amounts is parked on a single
-- controlled "GENEL" cost code so the item budgets always reconcile with
-- the total budget and nothing is double counted.
CREATE OR REPLACE FUNCTION public.pi_setup_project_budget(
  _project_id text,
  _original_revenue numeric DEFAULT NULL,
  _forecast_revenue numeric DEFAULT NULL,
  _total_budget numeric DEFAULT NULL,
  _items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  it jsonb;
  _code text;
  _name text;
  _amount numeric;
  _parent_code text;
  _parent_id uuid;
  _cc uuid;
  _items_total numeric := 0;
  _remainder numeric;
  _general uuid;
  _sort integer := 0;
BEGIN
  SELECT user_id INTO _owner FROM public.projects WHERE id::text = _project_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Proje bulunamadı';
  END IF;
  IF NOT (auth.uid() = _owner OR public.can_access_team_resource(auth.uid(), _owner)) THEN
    RAISE EXCEPTION 'Bu proje için yetkiniz yok';
  END IF;

  -- Revenue (only overwrite when a value is supplied)
  IF _original_revenue IS NOT NULL OR _forecast_revenue IS NOT NULL THEN
    UPDATE public.projects
       SET original_revenue = COALESCE(_original_revenue, original_revenue),
           forecast_revenue = COALESCE(_forecast_revenue, forecast_revenue)
     WHERE id::text = _project_id;
  END IF;

  -- Parent groups first (no budget rows on parents -> no double counting)
  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) LOOP
    _parent_code := NULLIF(btrim(COALESCE(it->>'parent_code','')), '');
    IF _parent_code IS NOT NULL THEN
      INSERT INTO public.cost_codes (user_id, project_id, code, name, category, sort_order)
      VALUES (_owner, _project_id, _parent_code,
              COALESCE(NULLIF(btrim(COALESCE(it->>'parent_name','')),''), _parent_code),
              'group', 0)
      ON CONFLICT (user_id, project_id, code) DO UPDATE
        SET is_active = true, updated_at = now();
    END IF;
  END LOOP;

  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb)) LOOP
    _code := NULLIF(btrim(COALESCE(it->>'code','')), '');
    _name := NULLIF(btrim(COALESCE(it->>'name','')), '');
    IF _code IS NULL AND _name IS NULL THEN CONTINUE; END IF;
    IF _code IS NULL THEN _code := upper(left(regexp_replace(_name, '[^a-zA-Z0-9]', '', 'g'), 12)); END IF;
    IF _code IS NULL OR _code = '' THEN CONTINUE; END IF;
    IF _code = 'GENEL' THEN CONTINUE; END IF;
    _amount := GREATEST(COALESCE((it->>'amount')::numeric, 0), 0);
    _sort := _sort + 1;

    _parent_id := NULL;
    _parent_code := NULLIF(btrim(COALESCE(it->>'parent_code','')), '');
    IF _parent_code IS NOT NULL THEN
      SELECT id INTO _parent_id FROM public.cost_codes
        WHERE user_id = _owner AND project_id = _project_id AND code = _parent_code;
    END IF;

    INSERT INTO public.cost_codes (user_id, project_id, parent_id, code, name, unit, sort_order)
    VALUES (_owner, _project_id, _parent_id, _code, COALESCE(_name, _code),
            NULLIF(btrim(COALESCE(it->>'unit','')),''), _sort)
    ON CONFLICT (user_id, project_id, code) DO UPDATE
      SET name = EXCLUDED.name,
          parent_id = COALESCE(EXCLUDED.parent_id, public.cost_codes.parent_id),
          unit = COALESCE(EXCLUDED.unit, public.cost_codes.unit),
          sort_order = EXCLUDED.sort_order,
          is_active = true,
          updated_at = now()
    RETURNING id INTO _cc;

    IF _cc IS NULL THEN
      SELECT id INTO _cc FROM public.cost_codes
        WHERE user_id = _owner AND project_id = _project_id AND code = _code;
    END IF;

    INSERT INTO public.cost_code_budgets (user_id, project_id, cost_code_id,
      budget_quantity, budget_unit, budget_unit_price, original_budget_amount)
    VALUES (_owner, _project_id, _cc,
      COALESCE((it->>'quantity')::numeric, 0),
      NULLIF(btrim(COALESCE(it->>'unit','')),''),
      COALESCE((it->>'unit_price')::numeric, 0),
      _amount)
    ON CONFLICT (cost_code_id) DO UPDATE
      SET budget_quantity = EXCLUDED.budget_quantity,
          budget_unit = EXCLUDED.budget_unit,
          budget_unit_price = EXCLUDED.budget_unit_price,
          original_budget_amount = EXCLUDED.original_budget_amount,
          updated_at = now();

    _items_total := _items_total + _amount;
  END LOOP;

  -- Remainder on the controlled general budget line
  IF _total_budget IS NOT NULL THEN
    _remainder := GREATEST(COALESCE(_total_budget,0) - _items_total, 0);

    SELECT id INTO _general FROM public.cost_codes
      WHERE user_id = _owner AND project_id = _project_id AND code = 'GENEL';

    IF _remainder > 0 THEN
      IF _general IS NULL THEN
        INSERT INTO public.cost_codes (user_id, project_id, code, name, category, sort_order)
        VALUES (_owner, _project_id, 'GENEL', 'Genel Proje Bütçesi', 'general', 999)
        RETURNING id INTO _general;
      ELSE
        UPDATE public.cost_codes SET is_active = true, updated_at = now() WHERE id = _general;
      END IF;

      INSERT INTO public.cost_code_budgets (user_id, project_id, cost_code_id, original_budget_amount)
      VALUES (_owner, _project_id, _general, _remainder)
      ON CONFLICT (cost_code_id) DO UPDATE
        SET original_budget_amount = EXCLUDED.original_budget_amount,
            budget_quantity = 0, budget_unit_price = 0, updated_at = now();
    ELSIF _general IS NOT NULL THEN
      UPDATE public.cost_code_budgets
         SET original_budget_amount = 0, budget_quantity = 0, budget_unit_price = 0, updated_at = now()
       WHERE cost_code_id = _general;
    END IF;
  END IF;

  RETURN public.pi_project_setup_summary(_project_id);
END $$;

GRANT EXECUTE ON FUNCTION public.pi_setup_project_budget(text, numeric, numeric, numeric, jsonb) TO authenticated;