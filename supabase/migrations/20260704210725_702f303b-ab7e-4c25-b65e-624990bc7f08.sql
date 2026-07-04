
-- Sprint 11.1 — Subscription & Licensing
-- Plans catalog, plan limits/features, org overrides, usage counters + audit log.

-- 1) plans
CREATE TABLE public.plans (
  internal_key text PRIMARY KEY,
  public_key text NOT NULL,
  display_name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans readable by all" ON public.plans FOR SELECT USING (true);

-- 2) plan_limits
CREATE TABLE public.plan_limits (
  plan_internal_key text NOT NULL REFERENCES public.plans(internal_key) ON DELETE CASCADE,
  limit_key text NOT NULL,
  limit_value bigint NOT NULL,       -- -1 = unlimited
  enforcement text NOT NULL DEFAULT 'hard' CHECK (enforcement IN ('hard','soft')),
  grace_pct int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_internal_key, limit_key)
);
GRANT SELECT ON public.plan_limits TO authenticated, anon;
GRANT ALL ON public.plan_limits TO service_role;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_limits readable by all" ON public.plan_limits FOR SELECT USING (true);

-- 3) plan_features
CREATE TABLE public.plan_features (
  plan_internal_key text NOT NULL REFERENCES public.plans(internal_key) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_internal_key, feature_key)
);
GRANT SELECT ON public.plan_features TO authenticated, anon;
GRANT ALL ON public.plan_features TO service_role;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features readable by all" ON public.plan_features FOR SELECT USING (true);

-- 4) org overrides
CREATE TABLE public.organization_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.office_teams(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL,
  expires_at timestamptz,
  reason text,
  set_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, feature_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_feature_overrides TO authenticated;
GRANT ALL ON public.organization_feature_overrides TO service_role;
ALTER TABLE public.organization_feature_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org feature overrides — team read"
  ON public.organization_feature_overrides FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()));
CREATE POLICY "org feature overrides — owner write"
  ON public.organization_feature_overrides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.office_teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.office_teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

CREATE TABLE public.organization_limit_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.office_teams(id) ON DELETE CASCADE,
  limit_key text NOT NULL,
  limit_value bigint NOT NULL,
  enforcement text CHECK (enforcement IN ('hard','soft')),
  grace_pct int,
  expires_at timestamptz,
  reason text,
  set_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, limit_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_limit_overrides TO authenticated;
GRANT ALL ON public.organization_limit_overrides TO service_role;
ALTER TABLE public.organization_limit_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org limit overrides — team read"
  ON public.organization_limit_overrides FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()));
CREATE POLICY "org limit overrides — owner write"
  ON public.organization_limit_overrides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.office_teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.office_teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

-- 5) usage counters + audit
CREATE TABLE public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.office_teams(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  metric_key text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, period_start, metric_key)
);
GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_counters — team read"
  ON public.usage_counters FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()));

CREATE TABLE public.usage_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.office_teams(id) ON DELETE CASCADE,
  user_id uuid,
  metric_key text NOT NULL,
  delta bigint NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.usage_audit_log TO authenticated;
GRANT ALL ON public.usage_audit_log TO service_role;
ALTER TABLE public.usage_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_audit_log — team read"
  ON public.usage_audit_log FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()));

-- 6) Seed plans
INSERT INTO public.plans (internal_key, public_key, display_name, sort_order) VALUES
  ('free',       'starter',      'Starter',      1),
  ('pro',        'starter',      'Starter Pro',  2),
  ('team',       'professional', 'Professional', 3),
  ('enterprise', 'enterprise',   'Enterprise',   4)
ON CONFLICT (internal_key) DO NOTHING;

-- 7) Seed limits
INSERT INTO public.plan_limits (plan_internal_key, limit_key, limit_value, enforcement, grace_pct) VALUES
  -- free
  ('free','users',3,'hard',0),
  ('free','projects',2,'hard',0),
  ('free','storage_mb',200,'hard',0),
  ('free','kb_storage_mb',100,'hard',0),
  ('free','company_memory_writes_month',50,'soft',10),
  ('free','voice_minutes_month',10,'soft',10),
  ('free','ai_requests_month',100,'soft',10),
  ('free','comm_messages_month',20,'soft',10),
  -- pro
  ('pro','users',10,'hard',0),
  ('pro','projects',15,'hard',0),
  ('pro','storage_mb',5000,'hard',0),
  ('pro','kb_storage_mb',2000,'hard',0),
  ('pro','company_memory_writes_month',500,'soft',10),
  ('pro','voice_minutes_month',300,'soft',10),
  ('pro','ai_requests_month',2000,'soft',10),
  ('pro','comm_messages_month',500,'soft',10),
  -- team = professional
  ('team','users',25,'hard',0),
  ('team','projects',75,'hard',0),
  ('team','storage_mb',25000,'hard',0),
  ('team','kb_storage_mb',10000,'hard',0),
  ('team','company_memory_writes_month',5000,'soft',10),
  ('team','voice_minutes_month',1500,'soft',10),
  ('team','ai_requests_month',15000,'soft',10),
  ('team','comm_messages_month',5000,'soft',10),
  -- enterprise = unlimited (-1)
  ('enterprise','users',500,'hard',0),
  ('enterprise','projects',-1,'hard',0),
  ('enterprise','storage_mb',-1,'hard',0),
  ('enterprise','kb_storage_mb',-1,'hard',0),
  ('enterprise','company_memory_writes_month',-1,'soft',10),
  ('enterprise','voice_minutes_month',-1,'soft',10),
  ('enterprise','ai_requests_month',-1,'soft',10),
  ('enterprise','comm_messages_month',-1,'soft',10)
ON CONFLICT DO NOTHING;

-- 8) Seed features (starter=free/pro get core; team gets +hub/meetings; enterprise gets all)
INSERT INTO public.plan_features (plan_internal_key, feature_key, enabled) VALUES
  -- free (starter tier)
  ('free','voice_copilot',true),
  ('free','executive_brief',true),
  ('free','company_memory',true),
  ('free','knowledge_base',true),
  ('free','communication_hub',false),
  ('free','email_accounts',false),
  ('free','whatsapp',false),
  ('free','meetings',false),
  ('free','hakedis_ai',false),
  ('free','contracts_ai',false),
  ('free','gayrimenkul360',false),
  ('free','demo_seed',true),
  ('free','advanced_reports',false),
  ('free','api_access',false),
  ('free','sso',false),
  -- pro (starter tier, upgraded)
  ('pro','voice_copilot',true),
  ('pro','executive_brief',true),
  ('pro','company_memory',true),
  ('pro','knowledge_base',true),
  ('pro','communication_hub',true),
  ('pro','email_accounts',true),
  ('pro','whatsapp',false),
  ('pro','meetings',true),
  ('pro','hakedis_ai',true),
  ('pro','contracts_ai',true),
  ('pro','gayrimenkul360',true),
  ('pro','demo_seed',true),
  ('pro','advanced_reports',false),
  ('pro','api_access',false),
  ('pro','sso',false),
  -- team (professional)
  ('team','voice_copilot',true),
  ('team','executive_brief',true),
  ('team','company_memory',true),
  ('team','knowledge_base',true),
  ('team','communication_hub',true),
  ('team','email_accounts',true),
  ('team','whatsapp',true),
  ('team','meetings',true),
  ('team','hakedis_ai',true),
  ('team','contracts_ai',true),
  ('team','gayrimenkul360',true),
  ('team','demo_seed',true),
  ('team','advanced_reports',true),
  ('team','api_access',false),
  ('team','sso',false),
  -- enterprise
  ('enterprise','voice_copilot',true),
  ('enterprise','executive_brief',true),
  ('enterprise','company_memory',true),
  ('enterprise','knowledge_base',true),
  ('enterprise','communication_hub',true),
  ('enterprise','email_accounts',true),
  ('enterprise','whatsapp',true),
  ('enterprise','meetings',true),
  ('enterprise','hakedis_ai',true),
  ('enterprise','contracts_ai',true),
  ('enterprise','gayrimenkul360',true),
  ('enterprise','demo_seed',true),
  ('enterprise','advanced_reports',true),
  ('enterprise','api_access',true),
  ('enterprise','sso',true)
ON CONFLICT DO NOTHING;

-- 9) organizations view over office_teams + owner profile plan
CREATE OR REPLACE VIEW public.organizations
WITH (security_invoker = true)
AS
  SELECT t.id,
         t.name,
         t.owner_id,
         p.plan          AS internal_plan_key,
         pl.public_key   AS public_plan,
         pl.display_name AS plan_display,
         t.created_at
    FROM public.office_teams t
    JOIN public.profiles p ON p.user_id = t.owner_id
    LEFT JOIN public.plans pl ON pl.internal_key = p.plan;

GRANT SELECT ON public.organizations TO authenticated;

-- 10) RPCs
CREATE OR REPLACE FUNCTION public.resolve_org_plan(_user uuid)
RETURNS TABLE(team_id uuid, internal_plan text, public_plan text, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.get_user_team_id(_user) AS team_id,
    COALESCE((
      SELECT p.plan FROM public.profiles p
       WHERE p.user_id = COALESCE(
         (SELECT owner_id FROM public.office_teams WHERE id = public.get_user_team_id(_user)),
         _user
       )
    ), 'free')                     AS internal_plan,
    COALESCE(pl.public_key, 'starter') AS public_plan,
    COALESCE(pl.display_name, 'Starter') AS display_name
  FROM public.plans pl
  WHERE pl.internal_key = COALESCE((
      SELECT p.plan FROM public.profiles p
       WHERE p.user_id = COALESCE(
         (SELECT owner_id FROM public.office_teams WHERE id = public.get_user_team_id(_user)),
         _user
       )
    ), 'free')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_feature(_key text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tid uuid;
  ov  boolean;
  ov_exp timestamptz;
  plan_key text;
  enabled boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT r.team_id, r.internal_plan INTO tid, plan_key FROM public.resolve_org_plan(uid) r;
  IF tid IS NOT NULL THEN
    SELECT enabled, expires_at INTO ov, ov_exp
      FROM public.organization_feature_overrides
     WHERE team_id = tid AND feature_key = _key;
    IF FOUND AND (ov_exp IS NULL OR ov_exp > now()) THEN
      RETURN ov;
    END IF;
  END IF;
  SELECT pf.enabled INTO enabled FROM public.plan_features pf
   WHERE pf.plan_internal_key = plan_key AND pf.feature_key = _key;
  RETURN COALESCE(enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_quota(_key text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tid uuid;
  plan_key text;
  lim bigint;
  enf text;
  gp int;
  used bigint := 0;
  ov RECORD;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauth'); END IF;
  SELECT r.team_id, r.internal_plan INTO tid, plan_key FROM public.resolve_org_plan(uid) r;

  IF tid IS NOT NULL THEN
    SELECT limit_value, enforcement, grace_pct, expires_at INTO ov
      FROM public.organization_limit_overrides
     WHERE team_id = tid AND limit_key = _key;
    IF FOUND AND (ov.expires_at IS NULL OR ov.expires_at > now()) THEN
      lim := ov.limit_value; enf := COALESCE(ov.enforcement,'hard'); gp := COALESCE(ov.grace_pct,0);
    END IF;
  END IF;

  IF lim IS NULL THEN
    SELECT limit_value, enforcement, grace_pct INTO lim, enf, gp
      FROM public.plan_limits WHERE plan_internal_key = plan_key AND limit_key = _key;
  END IF;

  IF lim IS NULL THEN
    RETURN jsonb_build_object('limit',null,'used',0,'remaining',null,'enforcement','soft','over',false);
  END IF;

  IF tid IS NOT NULL THEN
    SELECT COALESCE(value,0) INTO used FROM public.usage_counters
     WHERE team_id = tid AND metric_key = _key AND period_start = date_trunc('month', now())::date;
  END IF;

  RETURN jsonb_build_object(
    'limit', lim,
    'used', used,
    'remaining', CASE WHEN lim < 0 THEN null ELSE GREATEST(lim - used, 0) END,
    'enforcement', enf,
    'grace_pct', gp,
    'over', CASE WHEN lim < 0 THEN false ELSE used >= lim END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_plan_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tid uuid;
  plan_key text;
  pub text;
  disp text;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','unauth'); END IF;
  SELECT r.team_id, r.internal_plan, r.public_plan, r.display_name
    INTO tid, plan_key, pub, disp FROM public.resolve_org_plan(uid) r;

  SELECT jsonb_build_object(
    'team_id', tid,
    'internal_plan', plan_key,
    'public_plan', pub,
    'display_name', disp,
    'limits', COALESCE((
      SELECT jsonb_object_agg(limit_key, jsonb_build_object(
        'limit', limit_value, 'enforcement', enforcement, 'grace_pct', grace_pct))
      FROM public.plan_limits WHERE plan_internal_key = plan_key
    ), '{}'::jsonb),
    'features', COALESCE((
      SELECT jsonb_object_agg(feature_key, enabled)
      FROM public.plan_features WHERE plan_internal_key = plan_key
    ), '{}'::jsonb),
    'feature_overrides', COALESCE((
      SELECT jsonb_object_agg(feature_key, jsonb_build_object('enabled', enabled, 'expires_at', expires_at))
      FROM public.organization_feature_overrides
      WHERE team_id = tid AND (expires_at IS NULL OR expires_at > now())
    ), '{}'::jsonb),
    'limit_overrides', COALESCE((
      SELECT jsonb_object_agg(limit_key, jsonb_build_object(
        'limit', limit_value, 'enforcement', enforcement,
        'grace_pct', grace_pct, 'expires_at', expires_at))
      FROM public.organization_limit_overrides
      WHERE team_id = tid AND (expires_at IS NULL OR expires_at > now())
    ), '{}'::jsonb),
    'usage', COALESCE((
      SELECT jsonb_object_agg(metric_key, value)
      FROM public.usage_counters
      WHERE team_id = tid AND period_start = date_trunc('month', now())::date
    ), '{}'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_usage(_metric text, _delta bigint DEFAULT 1, _reason text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tid uuid;
  new_val bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  tid := public.get_user_team_id(uid);
  IF tid IS NULL THEN RETURN 0; END IF;

  INSERT INTO public.usage_counters (team_id, period_start, metric_key, value)
  VALUES (tid, date_trunc('month', now())::date, _metric, GREATEST(_delta,0))
  ON CONFLICT (team_id, period_start, metric_key)
  DO UPDATE SET value = public.usage_counters.value + EXCLUDED.value, updated_at = now()
  RETURNING value INTO new_val;

  INSERT INTO public.usage_audit_log (team_id, user_id, metric_key, delta, reason)
  VALUES (tid, uid, _metric, _delta, _reason);

  RETURN new_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_org_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_feature(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_quota(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_plan_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(text, bigint, text) TO authenticated, service_role;
