CREATE OR REPLACE FUNCTION public.effective_risk_thresholds(_owner uuid)
RETURNS public.risk_thresholds
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
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

GRANT EXECUTE ON FUNCTION public.effective_risk_thresholds(uuid) TO authenticated, service_role;