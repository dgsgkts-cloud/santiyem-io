-- =====================================================================
-- PROFIT INTELLIGENCE / AI PROJECT CONTROLS — FINANCIAL ENGINE (phase 1)
-- Additive only. No existing table/column/data is altered or removed.
-- Tenancy follows the existing pattern: user_id (owner) + team access via
-- public.can_access_team_resource(auth.uid(), user_id).
-- project_id is TEXT to stay compatible with existing modules.
-- =====================================================================

-- ---------- projects: revenue fields (additive, nullable) ----------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS original_revenue numeric,
  ADD COLUMN IF NOT EXISTS forecast_revenue numeric;

-- ---------- 1. COST CODES ----------
CREATE TABLE IF NOT EXISTS public.cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  parent_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  category text,
  unit text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cost_codes_project_code_key
  ON public.cost_codes (user_id, project_id, code);
CREATE INDEX IF NOT EXISTS cost_codes_project_idx ON public.cost_codes (project_id);
CREATE INDEX IF NOT EXISTS cost_codes_parent_idx ON public.cost_codes (parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_codes TO authenticated;
GRANT ALL ON public.cost_codes TO service_role;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

-- ---------- 2. BUDGETS (one row per cost code) ----------
CREATE TABLE IF NOT EXISTS public.cost_code_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  cost_code_id uuid NOT NULL UNIQUE REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  budget_quantity numeric NOT NULL DEFAULT 0,
  budget_unit text,
  budget_unit_price numeric NOT NULL DEFAULT 0,
  budget_material_cost numeric NOT NULL DEFAULT 0,
  budget_labor_cost numeric NOT NULL DEFAULT 0,
  budget_subcontractor_cost numeric NOT NULL DEFAULT 0,
  budget_other_cost numeric NOT NULL DEFAULT 0,
  original_budget_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cost_code_budgets_project_idx ON public.cost_code_budgets (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_code_budgets TO authenticated;
GRANT ALL ON public.cost_code_budgets TO service_role;
ALTER TABLE public.cost_code_budgets ENABLE ROW LEVEL SECURITY;

-- original_budget_amount is derived when not explicitly provided.
CREATE OR REPLACE FUNCTION public.cost_code_budget_normalize()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  breakdown numeric;
  qty_based numeric;
BEGIN
  breakdown := COALESCE(NEW.budget_material_cost,0) + COALESCE(NEW.budget_labor_cost,0)
             + COALESCE(NEW.budget_subcontractor_cost,0) + COALESCE(NEW.budget_other_cost,0);
  qty_based := COALESCE(NEW.budget_quantity,0) * COALESCE(NEW.budget_unit_price,0);
  IF COALESCE(NEW.original_budget_amount,0) = 0 THEN
    NEW.original_budget_amount := GREATEST(breakdown, qty_based);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cost_code_budgets_normalize ON public.cost_code_budgets;
CREATE TRIGGER cost_code_budgets_normalize
  BEFORE INSERT OR UPDATE ON public.cost_code_budgets
  FOR EACH ROW EXECUTE FUNCTION public.cost_code_budget_normalize();

-- ---------- 3. ACTUAL COST LEDGER ----------
CREATE TABLE IF NOT EXISTS public.cost_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  vendor_name text,
  cost_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity numeric,
  unit text,
  unit_price numeric,
  total_amount numeric NOT NULL DEFAULT 0,
  cost_type text NOT NULL DEFAULT 'other',
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid,
  commitment_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Double-count guard: one actual per source record.
CREATE UNIQUE INDEX IF NOT EXISTS cost_actuals_source_key
  ON public.cost_actuals (source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cost_actuals_project_idx ON public.cost_actuals (project_id, cost_date);
CREATE INDEX IF NOT EXISTS cost_actuals_code_idx ON public.cost_actuals (cost_code_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_actuals TO authenticated;
GRANT ALL ON public.cost_actuals TO service_role;
ALTER TABLE public.cost_actuals ENABLE ROW LEVEL SECURITY;

-- ---------- 4. COMMITMENTS ----------
CREATE TABLE IF NOT EXISTS public.cost_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  commitment_type text NOT NULL DEFAULT 'purchase_order',
  vendor_name text,
  reference_no text,
  original_committed_amount numeric NOT NULL DEFAULT 0,
  actualized_amount numeric NOT NULL DEFAULT 0,
  remaining_committed_amount numeric GENERATED ALWAYS AS
    (GREATEST(COALESCE(original_committed_amount,0) - COALESCE(actualized_amount,0), 0)) STORED,
  status text NOT NULL DEFAULT 'open',
  commitment_date date NOT NULL DEFAULT CURRENT_DATE,
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cost_commitments_source_key
  ON public.cost_commitments (source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cost_commitments_project_idx ON public.cost_commitments (project_id);
CREATE INDEX IF NOT EXISTS cost_commitments_code_idx ON public.cost_commitments (cost_code_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_commitments TO authenticated;
GRANT ALL ON public.cost_commitments TO service_role;
ALTER TABLE public.cost_commitments ENABLE ROW LEVEL SECURITY;

-- Actuals linked to a commitment automatically consume it (no double count).
CREATE OR REPLACE FUNCTION public.cost_commitment_sync_actualized()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid := COALESCE(NEW.commitment_id, OLD.commitment_id);
BEGIN
  IF target IS NOT NULL THEN
    UPDATE public.cost_commitments c
       SET actualized_amount = COALESCE((
             SELECT SUM(a.total_amount) FROM public.cost_actuals a WHERE a.commitment_id = c.id
           ), 0),
           updated_at = now()
     WHERE c.id = target;
    UPDATE public.cost_commitments c
       SET status = CASE WHEN c.remaining_committed_amount <= 0 AND c.status = 'open'
                         THEN 'closed' ELSE c.status END
     WHERE c.id = target;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.commitment_id IS NOT NULL AND OLD.commitment_id <> COALESCE(NEW.commitment_id, OLD.commitment_id) THEN
    UPDATE public.cost_commitments c
       SET actualized_amount = COALESCE((
             SELECT SUM(a.total_amount) FROM public.cost_actuals a WHERE a.commitment_id = c.id
           ), 0), updated_at = now()
     WHERE c.id = OLD.commitment_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS cost_actuals_sync_commitment ON public.cost_actuals;
CREATE TRIGGER cost_actuals_sync_commitment
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_actuals
  FOR EACH ROW EXECUTE FUNCTION public.cost_commitment_sync_actualized();

-- ---------- 5. PROGRESS ----------
CREATE TABLE IF NOT EXISTS public.cost_code_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  total_quantity numeric NOT NULL DEFAULT 0,
  completed_quantity numeric NOT NULL DEFAULT 0,
  progress_percent numeric GENERATED ALWAYS AS (
    CASE WHEN COALESCE(total_quantity,0) > 0
      THEN LEAST(COALESCE(completed_quantity,0) / total_quantity * 100, 100)
      ELSE 0 END) STORED,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cost_code_progress_code_idx
  ON public.cost_code_progress (cost_code_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS cost_code_progress_project_idx ON public.cost_code_progress (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_code_progress TO authenticated;
GRANT ALL ON public.cost_code_progress TO service_role;
ALTER TABLE public.cost_code_progress ENABLE ROW LEVEL SECURITY;

-- ---------- 6. FORECAST / ETC ----------
CREATE TABLE IF NOT EXISTS public.cost_code_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  remaining_quantity numeric NOT NULL DEFAULT 0,
  forecast_unit_cost numeric NOT NULL DEFAULT 0,
  manual_etc numeric,
  calculated_etc numeric GENERATED ALWAYS AS
    (COALESCE(remaining_quantity,0) * COALESCE(forecast_unit_cost,0)) STORED,
  is_manual boolean GENERATED ALWAYS AS (manual_etc IS NOT NULL) STORED,
  forecast_date date NOT NULL DEFAULT CURRENT_DATE,
  forecast_method text NOT NULL DEFAULT 'quantity_x_unit_cost',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cost_code_forecasts_code_idx
  ON public.cost_code_forecasts (cost_code_id, forecast_date DESC);
CREATE INDEX IF NOT EXISTS cost_code_forecasts_project_idx ON public.cost_code_forecasts (project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_code_forecasts TO authenticated;
GRANT ALL ON public.cost_code_forecasts TO service_role;
ALTER TABLE public.cost_code_forecasts ENABLE ROW LEVEL SECURITY;

-- ---------- 9. RISKS ----------
CREATE TABLE IF NOT EXISTS public.project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  risk_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  title text NOT NULL,
  description text,
  financial_impact numeric NOT NULL DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  source_type text NOT NULL DEFAULT 'rule_engine',
  source_id uuid,
  recommended_action text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_risks_project_idx ON public.project_risks (project_id, status);
CREATE INDEX IF NOT EXISTS project_risks_code_idx ON public.project_risks (cost_code_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_risks TO authenticated;
GRANT ALL ON public.project_risks TO service_role;
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;

-- ---------- 10. CONFIGURABLE RISK THRESHOLDS ----------
CREATE TABLE IF NOT EXISTS public.risk_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  eac_overrun_pct numeric NOT NULL DEFAULT 2,
  unit_price_variance_pct numeric NOT NULL DEFAULT 10,
  cost_progress_gap_pct numeric NOT NULL DEFAULT 15,
  commitment_budget_pct numeric NOT NULL DEFAULT 95,
  forecast_profit_drop_pct numeric NOT NULL DEFAULT 5,
  forecast_profit_drop_amount numeric NOT NULL DEFAULT 100000,
  etc_increase_pct numeric NOT NULL DEFAULT 15,
  profit_concentration_pct numeric NOT NULL DEFAULT 40,
  snapshot_lookback_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_thresholds TO authenticated;
GRANT ALL ON public.risk_thresholds TO service_role;
ALTER TABLE public.risk_thresholds ENABLE ROW LEVEL SECURITY;

-- ---------- 11. FORECAST SNAPSHOTS ----------
CREATE TABLE IF NOT EXISTS public.project_forecast_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  original_revenue numeric NOT NULL DEFAULT 0,
  forecast_revenue numeric NOT NULL DEFAULT 0,
  original_budget numeric NOT NULL DEFAULT 0,
  actual_cost numeric NOT NULL DEFAULT 0,
  committed_cost numeric NOT NULL DEFAULT 0,
  remaining_committed_cost numeric NOT NULL DEFAULT 0,
  etc numeric NOT NULL DEFAULT 0,
  eac numeric NOT NULL DEFAULT 0,
  forecast_profit numeric NOT NULL DEFAULT 0,
  forecast_margin numeric NOT NULL DEFAULT 0,
  profit_erosion numeric NOT NULL DEFAULT 0,
  budget_variance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS project_forecast_snapshots_daily_key
  ON public.project_forecast_snapshots (project_id, snapshot_date);
CREATE INDEX IF NOT EXISTS project_forecast_snapshots_project_idx
  ON public.project_forecast_snapshots (project_id, snapshot_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_forecast_snapshots TO authenticated;
GRANT ALL ON public.project_forecast_snapshots TO service_role;
ALTER TABLE public.project_forecast_snapshots ENABLE ROW LEVEL SECURITY;

-- ---------- updated_at triggers ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cost_codes','cost_actuals','cost_commitments','cost_code_progress',
                           'cost_code_forecasts','project_risks','risk_thresholds'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t||'_touch', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t||'_touch', t);
  END LOOP;
END $$;

-- ---------- 12. RLS POLICIES (owner + same-team access) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cost_codes','cost_code_budgets','cost_actuals','cost_commitments',
                           'cost_code_progress','cost_code_forecasts','project_risks',
                           'project_forecast_snapshots'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_team_access', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id))
      WITH CHECK (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id))$f$,
      t||'_team_access', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS risk_thresholds_owner ON public.risk_thresholds;
CREATE POLICY risk_thresholds_owner ON public.risk_thresholds FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- CALCULATION LAYER (single source of truth, deterministic, no AI)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.effective_risk_thresholds(_owner uuid)
RETURNS public.risk_thresholds
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.risk_thresholds;
BEGIN
  SELECT * INTO r FROM public.risk_thresholds WHERE user_id = _owner;
  IF NOT FOUND THEN
    r.user_id := _owner;
    r.eac_overrun_pct := 2; r.unit_price_variance_pct := 10; r.cost_progress_gap_pct := 15;
    r.commitment_budget_pct := 95; r.forecast_profit_drop_pct := 5;
    r.forecast_profit_drop_amount := 100000; r.etc_increase_pct := 15;
    r.profit_concentration_pct := 40; r.snapshot_lookback_days := 30;
  END IF;
  RETURN r;
END $$;

-- Cost-code level financials. SECURITY INVOKER => RLS applies to the caller.
CREATE OR REPLACE FUNCTION public.cost_code_financials(_project_id text)
RETURNS TABLE (
  cost_code_id uuid,
  code text,
  name text,
  parent_id uuid,
  unit text,
  original_budget numeric,
  budget_unit_price numeric,
  actual_cost numeric,
  latest_unit_price numeric,
  committed_total numeric,
  remaining_committed numeric,
  progress_percent numeric,
  consumed_budget_percent numeric,
  etc numeric,
  etc_is_manual boolean,
  uncommitted_remaining_forecast numeric,
  eac numeric,
  budget_variance numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
  )
  SELECT
    cc.id,
    cc.code,
    cc.name,
    cc.parent_id,
    cc.unit,
    COALESCE(b.budget,0),
    COALESCE(b.unit_price,0),
    COALESCE(a.actual,0),
    last_price.unit_price,
    COALESCE(cm.committed,0),
    COALESCE(cm.remaining,0),
    COALESCE(pr.progress_percent,0),
    CASE WHEN COALESCE(b.budget,0) > 0
         THEN COALESCE(a.actual,0) / b.budget * 100 ELSE 0 END,
    etc.v,
    COALESCE(fc.is_manual,false),
    GREATEST(etc.v - COALESCE(cm.remaining,0), 0),
    COALESCE(a.actual,0) + COALESCE(cm.remaining,0) + GREATEST(etc.v - COALESCE(cm.remaining,0), 0),
    (COALESCE(a.actual,0) + COALESCE(cm.remaining,0) + GREATEST(etc.v - COALESCE(cm.remaining,0), 0))
      - COALESCE(b.budget,0)
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
  ORDER BY cc.code;
$$;

-- Project level financials (the 11 headline metrics).
CREATE OR REPLACE FUNCTION public.project_financials(_project_id text)
RETURNS TABLE (
  project_id text,
  original_revenue numeric,
  forecast_revenue numeric,
  original_budget numeric,
  actual_cost numeric,
  committed_cost numeric,
  remaining_committed_cost numeric,
  etc numeric,
  eac numeric,
  original_expected_profit numeric,
  forecast_final_profit numeric,
  profit_erosion numeric,
  forecast_margin_percent numeric,
  budget_variance numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH p AS (
    SELECT pj.id, COALESCE(pj.original_revenue, pj.contract_amount, 0) AS orig_rev,
           COALESCE(pj.forecast_revenue, pj.original_revenue, pj.contract_amount, 0) AS fc_rev
    FROM public.projects pj WHERE pj.id::text = _project_id
  ),
  cf AS (SELECT * FROM public.cost_code_financials(_project_id)),
  agg AS (
    SELECT COALESCE(SUM(original_budget),0) AS budget,
           COALESCE(SUM(actual_cost),0) AS coded_actual,
           COALESCE(SUM(committed_total),0) AS committed,
           COALESCE(SUM(remaining_committed),0) AS remaining_committed,
           COALESCE(SUM(etc),0) AS etc,
           COALESCE(SUM(eac),0) AS eac
    FROM cf
  ),
  uncoded AS (
    SELECT COALESCE(SUM(total_amount),0) AS amount
    FROM public.cost_actuals
    WHERE project_id = _project_id AND cost_code_id IS NULL
  ),
  uncoded_cm AS (
    SELECT COALESCE(SUM(remaining_committed_amount),0) AS remaining,
           COALESCE(SUM(original_committed_amount),0) AS committed
    FROM public.cost_commitments
    WHERE project_id = _project_id AND cost_code_id IS NULL AND status <> 'cancelled'
  )
  SELECT
    _project_id,
    COALESCE((SELECT orig_rev FROM p),0),
    COALESCE((SELECT fc_rev FROM p),0),
    agg.budget,
    agg.coded_actual + uncoded.amount,
    agg.committed + uncoded_cm.committed,
    agg.remaining_committed + uncoded_cm.remaining,
    agg.etc,
    agg.eac + uncoded.amount + uncoded_cm.remaining,
    COALESCE((SELECT orig_rev FROM p),0) - agg.budget,
    COALESCE((SELECT fc_rev FROM p),0) - (agg.eac + uncoded.amount + uncoded_cm.remaining),
    (COALESCE((SELECT orig_rev FROM p),0) - agg.budget)
      - (COALESCE((SELECT fc_rev FROM p),0) - (agg.eac + uncoded.amount + uncoded_cm.remaining)),
    CASE WHEN COALESCE((SELECT fc_rev FROM p),0) > 0
      THEN (COALESCE((SELECT fc_rev FROM p),0) - (agg.eac + uncoded.amount + uncoded_cm.remaining))
           / (SELECT fc_rev FROM p) * 100
      ELSE 0 END,
    (agg.eac + uncoded.amount + uncoded_cm.remaining) - agg.budget
  FROM agg, uncoded, uncoded_cm;
$$;

-- Daily snapshot (idempotent per project/day).
CREATE OR REPLACE FUNCTION public.create_project_forecast_snapshot(_project_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE f record; owner uuid; sid uuid;
BEGIN
  SELECT user_id INTO owner FROM public.projects WHERE id::text = _project_id;
  IF owner IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO f FROM public.project_financials(_project_id);
  INSERT INTO public.project_forecast_snapshots (
    user_id, project_id, snapshot_date, original_revenue, forecast_revenue, original_budget,
    actual_cost, committed_cost, remaining_committed_cost, etc, eac, forecast_profit,
    forecast_margin, profit_erosion, budget_variance)
  VALUES (owner, _project_id, CURRENT_DATE, f.original_revenue, f.forecast_revenue,
    f.original_budget, f.actual_cost, f.committed_cost, f.remaining_committed_cost, f.etc, f.eac,
    f.forecast_final_profit, f.forecast_margin_percent, f.profit_erosion, f.budget_variance)
  ON CONFLICT (project_id, snapshot_date) DO UPDATE SET
    original_revenue = EXCLUDED.original_revenue,
    forecast_revenue = EXCLUDED.forecast_revenue,
    original_budget = EXCLUDED.original_budget,
    actual_cost = EXCLUDED.actual_cost,
    committed_cost = EXCLUDED.committed_cost,
    remaining_committed_cost = EXCLUDED.remaining_committed_cost,
    etc = EXCLUDED.etc, eac = EXCLUDED.eac,
    forecast_profit = EXCLUDED.forecast_profit,
    forecast_margin = EXCLUDED.forecast_margin,
    profit_erosion = EXCLUDED.profit_erosion,
    budget_variance = EXCLUDED.budget_variance
  RETURNING id INTO sid;
  RETURN sid;
END $$;

-- Deterministic risk rules A..G. Replaces only rule-engine generated OPEN risks.
CREATE OR REPLACE FUNCTION public.detect_project_risks(_project_id text)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  owner uuid; th public.risk_thresholds; pf record; prev record;
  inserted integer := 0; total_erosion numeric; r record;
BEGIN
  SELECT user_id INTO owner FROM public.projects WHERE id::text = _project_id;
  IF owner IS NULL THEN RETURN 0; END IF;
  th := public.effective_risk_thresholds(owner);
  SELECT * INTO pf FROM public.project_financials(_project_id);

  DELETE FROM public.project_risks
   WHERE project_id = _project_id AND source_type = 'rule_engine' AND status = 'open';

  -- A) EAC budget overrun (per cost code)
  FOR r IN SELECT * FROM public.cost_code_financials(_project_id) LOOP
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

    -- C) Cost vs progress mismatch
    IF r.original_budget > 0 AND r.consumed_budget_percent - r.progress_percent > th.cost_progress_gap_pct THEN
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

  -- Previous snapshot for trend based rules (D, F)
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

  -- G) Profit concentration risk
  total_erosion := NULLIF((SELECT SUM(GREATEST(budget_variance,0)) FROM public.cost_code_financials(_project_id)), 0);
  IF total_erosion IS NOT NULL THEN
    FOR r IN SELECT * FROM public.cost_code_financials(_project_id) LOOP
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
END $$;

GRANT EXECUTE ON FUNCTION public.cost_code_financials(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.project_financials(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_project_forecast_snapshot(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.detect_project_risks(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.effective_risk_thresholds(uuid) TO authenticated, service_role;