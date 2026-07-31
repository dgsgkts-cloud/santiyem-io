CREATE OR REPLACE FUNCTION public.resolve_billing_owner(_user uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.office_teams WHERE id = public.get_user_team_id(_user)),
    _user
  );
$$;

ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.usage_counters ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.usage_audit_log ADD COLUMN IF NOT EXISTS owner_id uuid;

UPDATE public.usage_counters uc
   SET owner_id = t.owner_id
  FROM public.office_teams t
 WHERE uc.team_id = t.id AND uc.owner_id IS NULL;

DELETE FROM public.usage_counters WHERE owner_id IS NULL;
ALTER TABLE public.usage_counters ALTER COLUMN owner_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usage_counters_owner_period_metric_key
  ON public.usage_counters (owner_id, period_start, metric_key);

DROP POLICY IF EXISTS "usage_counters — team read" ON public.usage_counters;
CREATE POLICY "usage_counters — account read"
  ON public.usage_counters FOR SELECT TO authenticated
  USING (owner_id = public.resolve_billing_owner(auth.uid()));

DROP POLICY IF EXISTS "usage_audit_log — team read" ON public.usage_audit_log;
CREATE POLICY "usage_audit_log — account read"
  ON public.usage_audit_log FOR SELECT TO authenticated
  USING (owner_id = public.resolve_billing_owner(auth.uid()));

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
GRANT SELECT ON public.usage_audit_log TO authenticated;
GRANT ALL ON public.usage_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.increment_usage(_metric text, _delta bigint DEFAULT 1, _reason text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  oid uuid;
  tid uuid;
  new_val bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  oid := public.resolve_billing_owner(uid);
  tid := public.get_user_team_id(uid);

  INSERT INTO public.usage_counters (owner_id, team_id, period_start, metric_key, value)
  VALUES (oid, tid, date_trunc('month', now())::date, _metric, GREATEST(_delta, 0))
  ON CONFLICT (owner_id, period_start, metric_key)
  DO UPDATE SET value = public.usage_counters.value + EXCLUDED.value, updated_at = now()
  RETURNING value INTO new_val;

  INSERT INTO public.usage_audit_log (owner_id, team_id, user_id, metric_key, delta, reason)
  VALUES (oid, tid, uid, _metric, _delta, _reason);

  RETURN new_val;
END;
$$;

INSERT INTO public.plans (internal_key, public_key, display_name, sort_order, is_public)
VALUES ('starter_paid', 'starter', 'Başlangıç', 2, true)
ON CONFLICT (internal_key) DO NOTHING;

UPDATE public.plans SET public_key = 'free',         display_name = 'Ücretsiz',    sort_order = 1 WHERE internal_key = 'free';
UPDATE public.plans SET public_key = 'starter',      display_name = 'Başlangıç',   sort_order = 2 WHERE internal_key = 'starter_paid';
UPDATE public.plans SET public_key = 'professional', display_name = 'Profesyonel', sort_order = 3 WHERE internal_key = 'pro';
UPDATE public.plans SET public_key = 'business',     display_name = 'İşletme',     sort_order = 4 WHERE internal_key = 'team';
UPDATE public.plans SET public_key = 'enterprise',   display_name = 'Kurumsal',    sort_order = 5 WHERE internal_key = 'enterprise';

DELETE FROM public.plan_limits
 WHERE plan_internal_key IN ('free','starter_paid','pro','team','enterprise');

INSERT INTO public.plan_limits (plan_internal_key, limit_key, limit_value, enforcement, grace_pct) VALUES
  ('free','users',1,'hard',0),
  ('free','projects',1,'hard',0),
  ('free','ai_requests_month',20,'hard',0),
  ('free','voice_minutes_month',0,'hard',0),
  ('free','comm_messages_month',0,'hard',0),
  ('free','company_memory_writes_month',20,'soft',10),
  ('free','storage_mb',250,'hard',0),
  ('free','kb_storage_mb',0,'hard',0),
  ('starter_paid','users',1,'hard',0),
  ('starter_paid','projects',1,'hard',0),
  ('starter_paid','ai_requests_month',500,'soft',10),
  ('starter_paid','voice_minutes_month',0,'hard',0),
  ('starter_paid','comm_messages_month',100,'soft',10),
  ('starter_paid','company_memory_writes_month',200,'soft',10),
  ('starter_paid','storage_mb',5000,'hard',0),
  ('starter_paid','kb_storage_mb',500,'hard',0),
  ('pro','users',3,'hard',0),
  ('pro','projects',10,'hard',0),
  ('pro','ai_requests_month',3000,'soft',10),
  ('pro','voice_minutes_month',300,'soft',10),
  ('pro','comm_messages_month',1000,'soft',10),
  ('pro','company_memory_writes_month',1000,'soft',10),
  ('pro','storage_mb',25000,'hard',0),
  ('pro','kb_storage_mb',5000,'hard',0),
  ('team','users',10,'hard',0),
  ('team','projects',50,'hard',0),
  ('team','ai_requests_month',15000,'soft',10),
  ('team','voice_minutes_month',1500,'soft',10),
  ('team','comm_messages_month',5000,'soft',10),
  ('team','company_memory_writes_month',5000,'soft',10),
  ('team','storage_mb',100000,'hard',0),
  ('team','kb_storage_mb',25000,'hard',0),
  ('enterprise','users',-1,'hard',0),
  ('enterprise','projects',-1,'hard',0),
  ('enterprise','ai_requests_month',-1,'soft',0),
  ('enterprise','voice_minutes_month',-1,'soft',0),
  ('enterprise','comm_messages_month',-1,'soft',0),
  ('enterprise','company_memory_writes_month',-1,'soft',0),
  ('enterprise','storage_mb',-1,'hard',0),
  ('enterprise','kb_storage_mb',-1,'hard',0);

DELETE FROM public.plan_features
 WHERE plan_internal_key IN ('free','starter_paid','pro','team','enterprise');

INSERT INTO public.plan_features (plan_internal_key, feature_key, enabled) VALUES
  ('free','voice_copilot',false),
  ('free','document_analysis',false),
  ('free','ai_actions',false),
  ('free','team_invite',false),
  ('free','roles_permissions',false),
  ('free','multi_project',false),
  ('free','advanced_finance',false),
  ('free','hakedis_ai',false),
  ('free','contracts_ai',false),
  ('free','meetings',false),
  ('free','communication_hub',false),
  ('free','whatsapp',false),
  ('free','whatsapp_automation',false),
  ('free','email_accounts',false),
  ('free','advanced_reports',false),
  ('free','export_premium',false),
  ('free','audit_log',false),
  ('free','api_access',false),
  ('free','sso',false),
  ('free','executive_brief',false),
  ('free','company_memory',true),
  ('free','knowledge_base',false),
  ('free','gayrimenkul360',false),
  ('free','demo_seed',true),
  ('starter_paid','voice_copilot',false),
  ('starter_paid','document_analysis',false),
  ('starter_paid','ai_actions',false),
  ('starter_paid','team_invite',false),
  ('starter_paid','roles_permissions',false),
  ('starter_paid','multi_project',false),
  ('starter_paid','advanced_finance',true),
  ('starter_paid','hakedis_ai',true),
  ('starter_paid','contracts_ai',false),
  ('starter_paid','meetings',false),
  ('starter_paid','communication_hub',false),
  ('starter_paid','whatsapp',false),
  ('starter_paid','whatsapp_automation',false),
  ('starter_paid','email_accounts',false),
  ('starter_paid','advanced_reports',false),
  ('starter_paid','export_premium',true),
  ('starter_paid','audit_log',false),
  ('starter_paid','api_access',false),
  ('starter_paid','sso',false),
  ('starter_paid','executive_brief',false),
  ('starter_paid','company_memory',true),
  ('starter_paid','knowledge_base',false),
  ('starter_paid','gayrimenkul360',false),
  ('starter_paid','demo_seed',true),
  ('pro','voice_copilot',true),
  ('pro','document_analysis',true),
  ('pro','ai_actions',true),
  ('pro','team_invite',true),
  ('pro','roles_permissions',true),
  ('pro','multi_project',true),
  ('pro','advanced_finance',true),
  ('pro','hakedis_ai',true),
  ('pro','contracts_ai',true),
  ('pro','meetings',true),
  ('pro','communication_hub',true),
  ('pro','whatsapp',true),
  ('pro','whatsapp_automation',false),
  ('pro','email_accounts',true),
  ('pro','advanced_reports',true),
  ('pro','export_premium',true),
  ('pro','audit_log',false),
  ('pro','api_access',false),
  ('pro','sso',false),
  ('pro','executive_brief',true),
  ('pro','company_memory',true),
  ('pro','knowledge_base',true),
  ('pro','gayrimenkul360',true),
  ('pro','demo_seed',true),
  ('team','voice_copilot',true),
  ('team','document_analysis',true),
  ('team','ai_actions',true),
  ('team','team_invite',true),
  ('team','roles_permissions',true),
  ('team','multi_project',true),
  ('team','advanced_finance',true),
  ('team','hakedis_ai',true),
  ('team','contracts_ai',true),
  ('team','meetings',true),
  ('team','communication_hub',true),
  ('team','whatsapp',true),
  ('team','whatsapp_automation',true),
  ('team','email_accounts',true),
  ('team','advanced_reports',true),
  ('team','export_premium',true),
  ('team','audit_log',true),
  ('team','api_access',false),
  ('team','sso',false),
  ('team','executive_brief',true),
  ('team','company_memory',true),
  ('team','knowledge_base',true),
  ('team','gayrimenkul360',true),
  ('team','demo_seed',true),
  ('enterprise','voice_copilot',true),
  ('enterprise','document_analysis',true),
  ('enterprise','ai_actions',true),
  ('enterprise','team_invite',true),
  ('enterprise','roles_permissions',true),
  ('enterprise','multi_project',true),
  ('enterprise','advanced_finance',true),
  ('enterprise','hakedis_ai',true),
  ('enterprise','contracts_ai',true),
  ('enterprise','meetings',true),
  ('enterprise','communication_hub',true),
  ('enterprise','whatsapp',true),
  ('enterprise','whatsapp_automation',true),
  ('enterprise','email_accounts',true),
  ('enterprise','advanced_reports',true),
  ('enterprise','export_premium',true),
  ('enterprise','audit_log',true),
  ('enterprise','api_access',true),
  ('enterprise','sso',true),
  ('enterprise','executive_brief',true),
  ('enterprise','company_memory',true),
  ('enterprise','knowledge_base',true),
  ('enterprise','gayrimenkul360',true),
  ('enterprise','demo_seed',true);

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS trial_plan text NOT NULL DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS trial_consumed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS downgraded_at timestamptz;

CREATE TABLE IF NOT EXISTS public.trial_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized text NOT NULL UNIQUE,
  user_id uuid,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.trial_claims TO service_role;
ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.resolve_org_plan(_user uuid)
RETURNS TABLE(team_id uuid, internal_plan text, public_plan text, display_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  owner uuid;
  base text;
  eff text;
  trial_key text;
BEGIN
  tid := public.get_user_team_id(_user);
  owner := public.resolve_billing_owner(_user);
  SELECT COALESCE(p.plan, 'free') INTO base FROM public.profiles p WHERE p.user_id = owner;
  base := COALESCE(base, 'free');
  IF base = 'admin' THEN base := 'enterprise'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE internal_key = base) THEN base := 'free'; END IF;

  SELECT COALESCE(s.trial_plan, 'pro') INTO trial_key
    FROM public.user_subscriptions s
   WHERE s.user_id = owner
     AND lower(s.status) IN ('trial', 'trialing')
     AND s.trial_end > now()
   ORDER BY s.created_at DESC
   LIMIT 1;

  eff := COALESCE(trial_key, base);

  RETURN QUERY
  SELECT tid,
         pl.internal_key,
         COALESCE(pl.public_key, 'free'),
         COALESCE(pl.display_name, 'Ücretsiz')
    FROM public.plans pl
   WHERE pl.internal_key = eff
   LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_email text := lower(trim(COALESCE(NEW.email, '')));
  claimed integer := 0;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, title, city, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'title', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'city', ''),
    CASE WHEN NEW.email = 'info@goktasglobal.com' THEN 'admin' ELSE 'free' END,
    NEW.email
  );

  IF norm_email <> '' THEN
    WITH ins AS (
      INSERT INTO public.trial_claims (email_normalized, user_id)
      VALUES (norm_email, NEW.id)
      ON CONFLICT (email_normalized) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO claimed FROM ins;
  END IF;

  IF claimed > 0 THEN
    INSERT INTO public.user_subscriptions
      (user_id, plan_name, status, trial_start, trial_end, amount, trial_plan, trial_consumed)
    VALUES
      (NEW.id, 'pro', 'trial', now(), now() + interval '14 days', 0, 'pro', true)
    ON CONFLICT (user_id, plan_name) DO NOTHING;
  ELSE
    INSERT INTO public.user_subscriptions
      (user_id, plan_name, status, trial_start, trial_end, amount, trial_plan, trial_consumed)
    VALUES
      (NEW.id, 'free', 'free', now(), now(), 0, 'pro', true)
    ON CONFLICT (user_id, plan_name) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
BEGIN
  WITH done AS (
    UPDATE public.user_subscriptions s
       SET status = 'expired',
           downgraded_at = now(),
           updated_at = now()
     WHERE lower(s.status) IN ('trial', 'trialing')
       AND s.trial_end <= now()
    RETURNING 1
  )
  SELECT count(*) INTO n FROM done;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
  s RECORD;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'unauth'); END IF;
  owner := public.resolve_billing_owner(uid);

  SELECT status, trial_start, trial_end, trial_plan, plan_name, next_payment_date, downgraded_at
    INTO s
    FROM public.user_subscriptions
   WHERE user_id = owner
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_trial', false, 'status', 'free', 'trial_active', false);
  END IF;

  RETURN jsonb_build_object(
    'has_trial', s.trial_end IS NOT NULL,
    'status', s.status,
    'trial_plan', COALESCE(s.trial_plan, 'pro'),
    'trial_start', s.trial_start,
    'trial_end', s.trial_end,
    'plan_name', s.plan_name,
    'next_payment_date', s.next_payment_date,
    'downgraded_at', s.downgraded_at,
    'trial_active', (lower(s.status) IN ('trial','trialing') AND s.trial_end > now()),
    'days_remaining', GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.trial_end - now())) / 86400))::int
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_usage()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
  tid uuid;
  active_users int := 1;
  active_projects int := 0;
  pending_invites int := 0;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error', 'unauth'); END IF;
  owner := public.resolve_billing_owner(uid);
  tid := public.get_user_team_id(uid);

  IF tid IS NOT NULL THEN
    SELECT count(*) INTO active_users FROM public.office_members WHERE team_id = tid;
    SELECT count(*) INTO pending_invites
      FROM public.office_invitations
     WHERE team_id = tid AND lower(COALESCE(status,'pending')) = 'pending';
    active_users := GREATEST(active_users, 1);
  END IF;

  SELECT count(*) INTO active_projects FROM public.projects WHERE user_id = owner;

  RETURN jsonb_build_object(
    'owner_id', owner,
    'active_users', active_users,
    'pending_invites', pending_invites,
    'seats_used', active_users + pending_invites,
    'active_projects', active_projects,
    'period_start', date_trunc('month', now())::date,
    'period_reset', (date_trunc('month', now()) + interval '1 month')::date,
    'counters', COALESCE((
      SELECT jsonb_object_agg(metric_key, value)
        FROM public.usage_counters
       WHERE owner_id = owner
         AND period_start = date_trunc('month', now())::date
    ), '{}'::jsonb)
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'santiyem-expire-trials') THEN
      PERFORM cron.unschedule('santiyem-expire-trials');
    END IF;
    PERFORM cron.schedule('santiyem-expire-trials', '17 3 * * *', 'SELECT public.expire_trials();');
  END IF;
END $$;