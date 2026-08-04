INSERT INTO public.plans (internal_key, public_key, display_name, sort_order, is_public)
VALUES ('demo_full_access', 'enterprise', 'Demo (Tam Erişim)', 99, false)
ON CONFLICT (internal_key) DO UPDATE SET public_key = EXCLUDED.public_key, display_name = EXCLUDED.display_name, is_public = false;

INSERT INTO public.plan_features (plan_internal_key, feature_key, enabled)
SELECT 'demo_full_access', feature_key, enabled FROM public.plan_features WHERE plan_internal_key = 'enterprise'
ON CONFLICT (plan_internal_key, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

INSERT INTO public.plan_limits (plan_internal_key, limit_key, limit_value, enforcement, grace_pct)
SELECT 'demo_full_access', limit_key, limit_value, enforcement, grace_pct FROM public.plan_limits WHERE plan_internal_key = 'enterprise'
ON CONFLICT (plan_internal_key, limit_key) DO UPDATE SET limit_value = EXCLUDED.limit_value, enforcement = EXCLUDED.enforcement, grace_pct = EXCLUDED.grace_pct;