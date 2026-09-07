REVOKE ALL ON FUNCTION public.cost_commitment_sync_actualized() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cost_code_budget_normalize() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.effective_risk_thresholds(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effective_risk_thresholds(uuid) TO service_role;