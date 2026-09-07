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
    AND po.cancelled_at IS NULL
    AND COALESCE(po.order_status,'') NOT IN ('Taslak','Reddedildi','İptal','İptal Edildi','İptal edildi');

  SELECT COALESCE(SUM(original_committed_amount),0) INTO pi_po FROM public.cost_commitments
   WHERE project_id = _project_id AND source_type='purchase_order' AND status <> 'cancelled';

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
                                   'missing', miss_po, 'balanced', src_po = pi_po),
    'purchase_invoices', jsonb_build_object('source_total', src_inv, 'pi_total', pi_inv,
                                   'balanced', src_inv = pi_inv),
    'duplicates', dup,
    'project_totals', jsonb_build_object('actual_cost', pf.actual_cost,
                                   'remaining_committed', pf.remaining_committed_cost,
                                   'eac', pf.eac)
  );
END $$;

REVOKE ALL ON FUNCTION public.reconcile_project_financial_sources(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reconcile_project_financial_sources(text) TO authenticated;