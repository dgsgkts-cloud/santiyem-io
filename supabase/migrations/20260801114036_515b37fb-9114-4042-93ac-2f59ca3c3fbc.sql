-- 1) extend project role permission templates with company-health keys
CREATE OR REPLACE FUNCTION public.role_default_permission(_role project_role, _key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'owner' THEN true
    WHEN 'manager' THEN CASE _key
      WHEN 'view_financials' THEN false
      WHEN 'manage_finance' THEN false
      WHEN 'view_costs' THEN true
      WHEN 'view_payments' THEN true
      WHEN 'view_diary' THEN true
      WHEN 'view_photos' THEN true
      WHEN 'view_attendance_all' THEN true
      WHEN 'view_progress' THEN true
      WHEN 'manage_members' THEN true
      WHEN 'view_company_health' THEN true
      WHEN 'view_company_health_projects' THEN true
      WHEN 'view_company_health_procurement' THEN true
      WHEN 'view_company_health_personnel' THEN true
      ELSE false END
    WHEN 'site_engineer' THEN CASE _key
      WHEN 'view_diary' THEN true
      WHEN 'view_photos' THEN true
      WHEN 'view_attendance_all' THEN true
      WHEN 'view_progress' THEN true
      WHEN 'edit_diary' THEN true
      WHEN 'edit_attendance' THEN true
      ELSE false END
    WHEN 'accountant' THEN CASE _key
      WHEN 'view_financials' THEN true
      WHEN 'view_costs' THEN true
      WHEN 'view_payments' THEN true
      WHEN 'manage_finance' THEN true
      WHEN 'view_company_health' THEN true
      WHEN 'view_company_health_financial' THEN true
      WHEN 'view_company_health_procurement' THEN true
      ELSE false END
    WHEN 'subcontractor' THEN CASE _key
      WHEN 'view_attendance_own_team' THEN true
      WHEN 'view_payments_own' THEN true
      ELSE false END
    WHEN 'worker' THEN CASE _key
      WHEN 'view_attendance_own' THEN true
      ELSE false END
    WHEN 'landowner' THEN CASE _key
      WHEN 'view_progress' THEN true
      WHEN 'view_photos' THEN true
      ELSE false END
    ELSE false END
$$;

-- 2) audit log
CREATE TABLE IF NOT EXISTS public.company_health_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid,
  team_id uuid,
  section text NOT NULL,
  action text NOT NULL DEFAULT 'view',
  scope text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.company_health_access_log TO authenticated;
GRANT ALL ON public.company_health_access_log TO service_role;
ALTER TABLE public.company_health_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own access log rows" ON public.company_health_access_log;
CREATE POLICY "own access log rows" ON public.company_health_access_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "insert own access log rows" ON public.company_health_access_log;
CREATE POLICY "insert own access log rows" ON public.company_health_access_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS company_health_access_log_owner_idx
  ON public.company_health_access_log (owner_id, created_at DESC);

-- 3) access resolver
CREATE OR REPLACE FUNCTION public.company_health_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
  tid uuid;
  office_role text;
  app_role text;
  is_full boolean := false;
  fin boolean := false;
  proj boolean := false;
  proc boolean := false;
  pers boolean := false;
  pids uuid[] := '{}';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('scope','none','can_view',false,'reason','unauth');
  END IF;

  IF public.is_member_suspended(uid) THEN
    RETURN jsonb_build_object('scope','none','can_view',false,'reason','suspended');
  END IF;

  owner := public.resolve_billing_owner(uid);
  tid := public.get_user_team_id(uid);
  SELECT role INTO app_role FROM public.profiles WHERE user_id = uid;
  SELECT role INTO office_role FROM public.office_members WHERE user_id = uid LIMIT 1;

  IF app_role = 'admin' OR owner = uid OR office_role IN ('owner','admin') THEN
    is_full := true;
  ELSIF office_role = 'editor' THEN
    is_full := true;
  END IF;

  IF is_full THEN
    RETURN jsonb_build_object(
      'scope','company','can_view',true,
      'financial',true,'projects',true,'procurement',true,'personnel',true,
      'can_export',true,'owner_id',owner,'team_id',tid,'project_ids','[]'::jsonb,
      'role', COALESCE(NULLIF(office_role,''), CASE WHEN owner = uid THEN 'owner' ELSE app_role END)
    );
  END IF;

  SELECT COALESCE(array_agg(DISTINCT m.project_id), '{}')
    INTO pids
    FROM public.project_members m
   WHERE m.user_id = uid
     AND public.has_project_permission(uid, m.project_id, 'view_company_health');

  IF pids IS NULL OR array_length(pids, 1) IS NULL THEN
    RETURN jsonb_build_object('scope','none','can_view',false,'reason','no_permission');
  END IF;

  SELECT
    bool_or(public.has_project_permission(uid, p, 'view_company_health_financial')),
    bool_or(public.has_project_permission(uid, p, 'view_company_health_projects')),
    bool_or(public.has_project_permission(uid, p, 'view_company_health_procurement')),
    bool_or(public.has_project_permission(uid, p, 'view_company_health_personnel'))
  INTO fin, proj, proc, pers
  FROM unnest(pids) AS p;

  RETURN jsonb_build_object(
    'scope','project','can_view',true,
    'financial',COALESCE(fin,false),'projects',COALESCE(proj,false),
    'procurement',COALESCE(proc,false),'personnel',COALESCE(pers,false),
    'can_export',false,'owner_id',owner,'team_id',tid,
    'project_ids', to_jsonb(pids),
    'role', 'project_member'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.company_health_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_health_access() TO authenticated, service_role;

-- 4) server-computed, permission-filtered company health payload
CREATE OR REPLACE FUNCTION public.get_company_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  acc jsonb := public.company_health_access();
  owner uuid;
  scope text;
  pids uuid[] := '{}';
  user_ids uuid[];
  today date := CURRENT_DATE;

  cash_total numeric := 0;
  cash_accounts_count int := 0;
  overdue_payables numeric := 0;
  overdue_count int := 0;
  upcoming_payables numeric := 0;
  open_receivables numeric := 0;
  payment_rows int := 0;

  active_projects int := 0;
  total_projects int := 0;
  projects_with_budget int := 0;
  over_budget int := 0;
  avg_progress numeric := 0;

  open_orders int := 0;
  order_rows int := 0;
  unmatched_invoices int := 0;

  active_personnel int := 0;
  diary_last7 int := 0;

  factors jsonb := '[]'::jsonb;
  sections jsonb := '{}'::jsonb;
  present int := 0;
  expected int := 0;
  score numeric := 0;
  weight numeric := 0;
BEGIN
  IF NOT (acc->>'can_view')::boolean THEN
    RAISE EXCEPTION 'company_health_forbidden: %', COALESCE(acc->>'reason','no_permission');
  END IF;

  owner := (acc->>'owner_id')::uuid;
  scope := acc->>'scope';
  SELECT COALESCE(array_agg((v)::uuid), '{}') INTO pids
    FROM jsonb_array_elements_text(acc->'project_ids') AS v;

  IF (acc->>'team_id') IS NOT NULL THEN
    SELECT COALESCE(array_agg(user_id), ARRAY[owner]) INTO user_ids
      FROM public.office_members WHERE team_id = (acc->>'team_id')::uuid;
  ELSE
    user_ids := ARRAY[owner];
  END IF;

  -- ── financial ─────────────────────────────────────────────
  IF (acc->>'financial')::boolean THEN
    expected := expected + 1;

    SELECT COALESCE(SUM(balance),0), COUNT(*) INTO cash_total, cash_accounts_count
      FROM public.cash_accounts WHERE user_id = ANY(user_ids);

    SELECT COALESCE(SUM(amount),0), COUNT(*) INTO overdue_payables, overdue_count
      FROM public.cash_payments
     WHERE user_id = ANY(user_ids)
       AND COALESCE(status,'') <> 'odendi'
       AND payment_date < today
       AND (scope <> 'project' OR project_id = ANY(pids));

    SELECT COALESCE(SUM(amount),0) INTO upcoming_payables
      FROM public.cash_checks
     WHERE user_id = ANY(user_ids)
       AND COALESCE(status,'') NOT IN ('odendi','tahsil_edildi')
       AND due_date >= today AND due_date < today + 30
       AND (scope <> 'project' OR project_id = ANY(pids));

    SELECT COALESCE(SUM(COALESCE(net_total, net, amount, 0)),0) INTO open_receivables
      FROM public.project_hakedis
     WHERE user_id = ANY(user_ids)
       AND payment_date IS NULL
       AND (scope <> 'project' OR project_id = ANY(pids));

    SELECT COUNT(*) INTO payment_rows
      FROM public.cash_payments WHERE user_id = ANY(user_ids);

    IF cash_accounts_count > 0 OR payment_rows > 0 THEN
      present := present + 1;
      weight := weight + 40;
      score := score + 40 * CASE
        WHEN cash_total <= 0 THEN 0.2
        WHEN overdue_payables = 0 THEN 1
        WHEN cash_total > overdue_payables * 2 THEN 0.8
        WHEN cash_total > overdue_payables THEN 0.6
        ELSE 0.3 END;
      factors := factors || jsonb_build_array(jsonb_build_object(
        'key','cash_vs_payables','label','Nakit / vadesi geçmiş borç dengesi',
        'weight',40,'section','financial',
        'detail', CASE WHEN overdue_count = 0
          THEN 'Vadesi geçmiş ödeme kaydı yok.'
          ELSE overdue_count || ' vadesi geçmiş ödeme kaydı var.' END
      ));
    END IF;

    sections := sections || jsonb_build_object('financial', jsonb_build_object(
      'cash_on_hand', cash_total,
      'cash_accounts', cash_accounts_count,
      'overdue_payables', overdue_payables,
      'overdue_count', overdue_count,
      'checks_due_30d', upcoming_payables,
      'open_receivables', open_receivables,
      'has_data', (cash_accounts_count > 0 OR payment_rows > 0)
    ));
  END IF;

  -- ── projects ──────────────────────────────────────────────
  IF (acc->>'projects')::boolean THEN
    expected := expected + 1;

    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE COALESCE(status,'') NOT IN ('tamamlandi','iptal')),
           COUNT(*) FILTER (WHERE COALESCE(budget,0) > 0),
           COALESCE(AVG(COALESCE(progress,0)),0)
      INTO total_projects, active_projects, projects_with_budget, avg_progress
      FROM public.projects
     WHERE (scope = 'project' AND id = ANY(pids)) OR (scope = 'company' AND user_id = ANY(user_ids));

    SELECT COUNT(*) INTO over_budget FROM (
      SELECT p.id, p.budget, COALESCE(SUM(e.amount),0) AS spent
        FROM public.projects p
        LEFT JOIN public.project_expenses e ON e.project_id = p.id
       WHERE ((scope = 'project' AND p.id = ANY(pids)) OR (scope = 'company' AND p.user_id = ANY(user_ids)))
         AND COALESCE(p.budget,0) > 0
       GROUP BY p.id, p.budget
      HAVING COALESCE(SUM(e.amount),0) > p.budget
    ) q;

    IF total_projects > 0 THEN
      present := present + 1;
      weight := weight + 35;
      score := score + 35 * CASE
        WHEN projects_with_budget = 0 THEN 0.7
        WHEN over_budget = 0 THEN 1
        ELSE GREATEST(0.2, 1 - (over_budget::numeric / projects_with_budget)) END;
      factors := factors || jsonb_build_array(jsonb_build_object(
        'key','budget_discipline','label','Proje bütçe uyumu',
        'weight',35,'section','projects',
        'detail', CASE WHEN projects_with_budget = 0
          THEN 'Projelerde bütçe girilmediği için bu kalem nötr sayıldı.'
          ELSE over_budget || ' / ' || projects_with_budget || ' proje bütçesini aştı.' END
      ));
    END IF;

    sections := sections || jsonb_build_object('projects', jsonb_build_object(
      'total', total_projects, 'active', active_projects,
      'with_budget', projects_with_budget, 'over_budget', over_budget,
      'avg_progress', ROUND(avg_progress, 1),
      'has_data', total_projects > 0
    ));
  END IF;

  -- ── procurement ───────────────────────────────────────────
  IF (acc->>'procurement')::boolean THEN
    expected := expected + 1;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE COALESCE(order_status,'') NOT IN ('completed','cancelled'))
      INTO order_rows, open_orders
      FROM public.purchase_orders
     WHERE ((scope = 'project' AND project_id = ANY(pids)) OR (scope = 'company' AND user_id = ANY(user_ids)));

    SELECT COUNT(*) INTO unmatched_invoices
      FROM public.purchase_order_invoices i
      JOIN public.purchase_orders o ON o.id = i.order_id
     WHERE COALESCE(i.match_result,'') NOT IN ('matched','ok')
       AND ((scope = 'project' AND o.project_id = ANY(pids)) OR (scope = 'company' AND o.user_id = ANY(user_ids)));

    IF order_rows > 0 THEN
      present := present + 1;
      weight := weight + 15;
      score := score + 15 * CASE
        WHEN unmatched_invoices = 0 THEN 1
        WHEN unmatched_invoices <= 2 THEN 0.7
        ELSE 0.4 END;
      factors := factors || jsonb_build_array(jsonb_build_object(
        'key','three_way_match','label','Satın alma fatura eşleşmesi',
        'weight',15,'section','procurement',
        'detail', unmatched_invoices || ' fatura sipariş/irsaliye ile eşleşmiyor.'
      ));
    END IF;

    sections := sections || jsonb_build_object('procurement', jsonb_build_object(
      'orders', order_rows, 'open_orders', open_orders,
      'unmatched_invoices', unmatched_invoices,
      'has_data', order_rows > 0
    ));
  END IF;

  -- ── personnel / field activity ─────────────────────────────
  IF (acc->>'personnel')::boolean THEN
    expected := expected + 1;

    SELECT COUNT(*) INTO active_personnel
      FROM public.personnel WHERE user_id = ANY(user_ids) AND is_active = true;

    SELECT COUNT(*) INTO diary_last7
      FROM public.site_diary_entries
     WHERE ((scope = 'project' AND project_id = ANY(pids)) OR (scope = 'company' AND user_id = ANY(user_ids)))
       AND entry_date >= today - 7;

    IF active_personnel > 0 OR diary_last7 > 0 THEN
      present := present + 1;
      weight := weight + 10;
      score := score + 10 * CASE
        WHEN diary_last7 >= 5 THEN 1
        WHEN diary_last7 >= 1 THEN 0.7
        ELSE 0.4 END;
      factors := factors || jsonb_build_array(jsonb_build_object(
        'key','field_reporting','label','Saha raporlama düzeni',
        'weight',10,'section','personnel',
        'detail', 'Son 7 günde ' || diary_last7 || ' şantiye günlüğü kaydı girildi.'
      ));
    END IF;

    sections := sections || jsonb_build_object('personnel', jsonb_build_object(
      'active_personnel', active_personnel,
      'diary_last_7_days', diary_last7,
      'has_data', (active_personnel > 0 OR diary_last7 > 0)
    ));
  END IF;

  RETURN jsonb_build_object(
    'access', acc,
    'generated_at', now(),
    'sections', sections,
    'factors', factors,
    'completeness', jsonb_build_object(
      'present', present, 'expected', expected,
      'ratio', CASE WHEN expected = 0 THEN 0 ELSE ROUND(present::numeric / expected, 2) END
    ),
    'computable', (weight >= 40),
    'score', CASE WHEN weight = 0 THEN NULL ELSE ROUND(score / weight * 100) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_health() TO authenticated, service_role;

-- 5) audit helper
CREATE OR REPLACE FUNCTION public.log_company_health_access(_section text, _action text DEFAULT 'view')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  acc jsonb;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  acc := public.company_health_access();
  INSERT INTO public.company_health_access_log (user_id, owner_id, team_id, section, action, scope)
  VALUES (uid, (acc->>'owner_id')::uuid, (acc->>'team_id')::uuid,
          COALESCE(_section,'overview'), COALESCE(_action,'view'), acc->>'scope');
END;
$$;

REVOKE ALL ON FUNCTION public.log_company_health_access(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_company_health_access(text, text) TO authenticated, service_role;