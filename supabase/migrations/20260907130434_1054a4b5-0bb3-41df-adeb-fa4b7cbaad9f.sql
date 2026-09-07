CREATE OR REPLACE FUNCTION public.portfolio_financials()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
WITH proj AS (
  SELECT pj.id, pj.name, pj.status FROM public.projects pj
),
fin AS (
  SELECT p.id, p.name, p.status, f.*
  FROM proj p
  CROSS JOIN LATERAL public.project_financials(p.id::text) f
),
rk AS (
  SELECT r.project_id,
         COUNT(*) AS open_risks,
         COUNT(*) FILTER (WHERE r.severity = 'critical') AS critical_risks,
         COALESCE(SUM(r.financial_impact), 0) AS risk_amount
  FROM public.project_risks r
  WHERE r.status IN ('open', 'acknowledged')
  GROUP BY r.project_id
),
rows AS (
  SELECT f.id, f.name, f.status,
         f.original_revenue, f.forecast_revenue, f.original_budget,
         f.actual_cost, f.eac,
         f.original_expected_profit, f.forecast_final_profit, f.profit_erosion,
         f.forecast_margin_percent,
         COALESCE(rk.open_risks, 0) AS open_risks,
         COALESCE(rk.critical_risks, 0) AS critical_risks,
         COALESCE(rk.risk_amount, 0) AS risk_amount,
         (f.original_budget > 0 AND f.forecast_revenue > 0) AS is_ready
  FROM fin f
  LEFT JOIN rk ON rk.project_id = f.id::text
),
ready AS (SELECT * FROM rows WHERE is_ready),
top_risks AS (
  SELECT r.id, r.project_id, p.name AS project_name, r.risk_type, r.severity,
         r.title, r.description, r.financial_impact, r.cost_code_id, r.detected_at
  FROM public.project_risks r
  JOIN public.projects p ON p.id::text = r.project_id
  WHERE r.status IN ('open', 'acknowledged')
  ORDER BY CASE r.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           COALESCE(r.financial_impact, 0) DESC
  LIMIT 10
)
SELECT jsonb_build_object(
  'totals', (
    SELECT jsonb_build_object(
      'project_count', (SELECT COUNT(*) FROM rows),
      'ready_count', COUNT(*),
      'forecast_final_profit', COALESCE(SUM(forecast_final_profit), 0),
      'original_expected_profit', COALESCE(SUM(original_expected_profit), 0),
      'profit_erosion', COALESCE(SUM(profit_erosion), 0),
      'forecast_revenue', COALESCE(SUM(forecast_revenue), 0),
      'actual_cost', COALESCE(SUM(actual_cost), 0),
      'eac', COALESCE(SUM(eac), 0),
      'open_risks', COALESCE(SUM(open_risks), 0),
      'risk_amount', COALESCE(SUM(risk_amount), 0)
    ) FROM ready
  ),
  'projects', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM rows r), '[]'::jsonb),
  'risks', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM top_risks t), '[]'::jsonb)
);
$function$;

GRANT EXECUTE ON FUNCTION public.portfolio_financials() TO authenticated, service_role;