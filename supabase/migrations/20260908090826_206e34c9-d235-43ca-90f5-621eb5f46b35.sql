-- ============================================================
-- WhatsApp Yönetici Özeti — Faz 1 (yalnızca giden özet)
-- Finans motoru dokunulmadı; bu katman sadece okur.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_summary_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  provider text NOT NULL DEFAULT 'whatsapp_cloud',
  external_recipient_id text,
  phone_number text,
  business_scoped_user_id text,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  opt_in boolean NOT NULL DEFAULT false,
  opt_in_at timestamptz,
  summary_frequency text NOT NULL DEFAULT 'daily'
    CHECK (summary_frequency IN ('daily', 'weekly', 'off')),
  preferred_time time NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'Europe/Istanbul',
  weekday smallint NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 0 AND 6),
  summary_scope text NOT NULL DEFAULT 'all_projects'
    CHECK (summary_scope IN ('all_projects', 'selected_projects')),
  project_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_summary_recipients TO authenticated;
GRANT ALL ON public.whatsapp_summary_recipients TO service_role;
ALTER TABLE public.whatsapp_summary_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_recipients_select" ON public.whatsapp_summary_recipients
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "wa_recipients_insert" ON public.whatsapp_summary_recipients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wa_recipients_update" ON public.whatsapp_summary_recipients
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id))
  WITH CHECK (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));
CREATE POLICY "wa_recipients_delete" ON public.whatsapp_summary_recipients
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));

CREATE INDEX IF NOT EXISTS idx_wa_recipients_user ON public.whatsapp_summary_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_recipients_active
  ON public.whatsapp_summary_recipients(is_active, summary_frequency);

DROP TRIGGER IF EXISTS trg_wa_recipients_updated ON public.whatsapp_summary_recipients;
CREATE TRIGGER trg_wa_recipients_updated
  BEFORE UPDATE ON public.whatsapp_summary_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------ mesaj kayıtları
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid REFERENCES public.whatsapp_summary_recipients(id) ON DELETE SET NULL,
  recipient_label text,
  message_type text NOT NULL
    CHECK (message_type IN ('daily_summary', 'weekly_summary', 'test_summary', 'critical_alert')),
  related_project_id text,
  period_key text NOT NULL,
  payload_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider text,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_message_logs TO authenticated;
GRANT ALL ON public.whatsapp_message_logs TO service_role;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_logs_select" ON public.whatsapp_message_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_access_team_resource(auth.uid(), user_id));

-- Aynı alıcı + aynı özet dönemi tek kayıt (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_logs_period
  ON public.whatsapp_message_logs(recipient_id, message_type, period_key)
  WHERE message_type <> 'test_summary';
CREATE INDEX IF NOT EXISTS idx_wa_logs_provider_msg
  ON public.whatsapp_message_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_user_created
  ON public.whatsapp_message_logs(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_wa_logs_updated ON public.whatsapp_message_logs;
CREATE TRIGGER trg_wa_logs_updated
  BEFORE UPDATE ON public.whatsapp_message_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------- deterministik özet verisi
-- Mevcut finans motorunu (project_financials) ve risk motorunu yeniden kullanır.
-- Yeni finansal formül YOKTUR; yalnızca kullanıcı kapsamında toplama yapar.
CREATE OR REPLACE FUNCTION public.whatsapp_summary_snapshot(
  _user_id uuid,
  _project_ids text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
WITH proj AS (
  SELECT pj.id, pj.name, pj.status
  FROM public.projects pj
  WHERE pj.user_id = _user_id
    AND COALESCE(pj.status, '') <> 'Tamamlandı'
    AND (_project_ids IS NULL OR array_length(_project_ids, 1) IS NULL
         OR pj.id::text = ANY (_project_ids))
),
fin AS (
  SELECT p.id, p.name, p.status, f.*
  FROM proj p
  CROSS JOIN LATERAL public.project_financials(p.id::text) f
),
rows AS (
  SELECT f.id, f.name, f.status,
         f.forecast_revenue, f.original_budget, f.actual_cost, f.eac,
         f.original_expected_profit, f.forecast_final_profit, f.profit_erosion,
         (f.original_budget > 0 AND f.forecast_revenue > 0) AS is_ready
  FROM fin f
),
ready AS (SELECT * FROM rows WHERE is_ready),
top_risks AS (
  SELECT r.id, r.project_id, p.name AS project_name, r.risk_type, r.severity,
         r.title, r.financial_impact, r.detected_at
  FROM public.project_risks r
  JOIN proj p ON p.id::text = r.project_id
  WHERE r.status IN ('open', 'acknowledged')
  ORDER BY CASE r.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1
             WHEN 'medium' THEN 2 ELSE 3 END,
           COALESCE(r.financial_impact, 0) DESC
  LIMIT 5
)
SELECT jsonb_build_object(
  'active_project_count', (SELECT COUNT(*) FROM rows),
  'ready_count', (SELECT COUNT(*) FROM ready),
  'portfolio_forecast_profit', (SELECT COALESCE(SUM(forecast_final_profit), 0) FROM ready),
  'portfolio_expected_profit', (SELECT COALESCE(SUM(original_expected_profit), 0) FROM ready),
  'portfolio_profit_erosion', (SELECT COALESCE(SUM(profit_erosion), 0) FROM ready),
  'projects', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM rows r), '[]'::jsonb),
  'top_risks', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM top_risks t), '[]'::jsonb)
);
$function$;

REVOKE ALL ON FUNCTION public.whatsapp_summary_snapshot(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.whatsapp_summary_snapshot(uuid, text[]) TO service_role;