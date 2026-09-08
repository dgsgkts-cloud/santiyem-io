-- =========================================================
-- Internal Admin Panel — güvenli platform yönetici altyapısı
-- Hiçbir müşteri verisi silinmez; yalnızca yeni rol tablosu,
-- denetim kaydı ve salt-okuma yönetici raporları eklenir.
-- =========================================================

-- 1) Platform admin rolü (ayrı tablo — profil üzerinden yetki yükseltme riski yok)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

DROP POLICY IF EXISTS "platform_admins_select" ON public.platform_admins;
CREATE POLICY "platform_admins_select" ON public.platform_admins
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

-- Mevcut yönetici hesapları korunur
INSERT INTO public.platform_admins (user_id, note)
SELECT p.user_id, 'seed: profiles.role=admin'
FROM public.profiles p
WHERE p.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Kendi yetkisini sorgulama (frontend guard)
CREATE OR REPLACE FUNCTION public.admin_whoami()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin(auth.uid());
$$;

-- 2) Denetim kaydı
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_log_select" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_log_action(
  _action text, _target_type text DEFAULT NULL, _target_id text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 3) Firma birimi eşlemesi (ofis ekibi + tek kullanıcılı hesaplar) — dahili
CREATE OR REPLACE FUNCTION public.admin_unit_map()
RETURNS TABLE (unit_id text, unit_name text, owner_id uuid, kind text, member_id uuid, unit_created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH team_members AS (
    SELECT m.team_id, m.user_id FROM public.office_members m
    UNION
    SELECT t.id, t.owner_id FROM public.office_teams t
  ),
  grouped AS (
    SELECT 'team:' || t.id::text, COALESCE(NULLIF(t.name, ''), 'Firma'), t.owner_id, 'team'::text, tm.user_id, t.created_at
    FROM public.office_teams t
    JOIN team_members tm ON tm.team_id = t.id
  ),
  solo AS (
    SELECT 'user:' || p.user_id::text, COALESCE(NULLIF(p.full_name, ''), p.email, 'Kullanıcı'), p.user_id, 'solo'::text, p.user_id, p.created_at
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = p.user_id)
  )
  SELECT * FROM grouped
  UNION ALL
  SELECT * FROM solo;
$$;
REVOKE ALL ON FUNCTION public.admin_unit_map() FROM PUBLIC, anon, authenticated;

-- 4) Genel bakış
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'total_companies', (SELECT count(DISTINCT unit_id) FROM public.admin_unit_map()),
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_users_30d', (
      SELECT count(DISTINCT u) FROM (
        SELECT user_id AS u FROM public.projects WHERE created_at > now() - interval '30 days'
        UNION SELECT user_id FROM public.ai_project_insights WHERE generated_at > now() - interval '30 days'
        UNION SELECT user_id FROM public.whatsapp_message_logs WHERE created_at > now() - interval '30 days'
        UNION SELECT user_id FROM public.project_forecast_snapshots WHERE created_at > now() - interval '30 days'
      ) s
    ),
    'active_projects', (SELECT count(*) FROM public.projects WHERE COALESCE(status, '') NOT IN ('Tamamlandı', 'completed', 'İptal', 'cancelled')),
    'total_projects', (SELECT count(*) FROM public.projects),
    'profit_ready_projects', (SELECT count(DISTINCT project_id) FROM public.cost_code_budgets),
    'whatsapp_connected', (SELECT count(*) FROM public.whatsapp_connections WHERE connection_status = 'connected'),
    'ai_insights_24h', (SELECT count(*) FROM public.ai_project_insights WHERE generated_at > now() - interval '24 hours'),
    'failed_messages_24h', (SELECT count(*) FROM public.whatsapp_message_logs WHERE status = 'failed' AND created_at > now() - interval '24 hours'),
    'open_risks', (SELECT count(*) FROM public.project_risks WHERE status = 'open')
  ) INTO v;
  RETURN v;
END $$;

-- 5) Firmalar (sunucu tarafı arama + sayfalama, N+1 yok)
CREATE OR REPLACE FUNCTION public.admin_companies(_search text DEFAULT NULL, _limit int DEFAULT 25, _offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_total int; v_lim int := LEAST(GREATEST(COALESCE(_limit, 25), 1), 100);
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  WITH units AS (SELECT * FROM public.admin_unit_map()),
  agg AS (
    SELECT
      u.unit_id, max(u.unit_name) AS unit_name, max(u.owner_id::text)::uuid AS owner_id,
      max(u.kind) AS kind, min(u.unit_created_at) AS created_at,
      count(DISTINCT u.member_id) AS user_count,
      count(DISTINCT p.id) AS project_count,
      count(DISTINCT p.id) FILTER (WHERE COALESCE(p.status, '') NOT IN ('Tamamlandı', 'completed', 'İptal', 'cancelled')) AS active_project_count,
      count(DISTINCT b.project_id) AS profit_ready_count,
      max(GREATEST(COALESCE(p.created_at, 'epoch'::timestamptz), COALESCE(w.created_at, 'epoch'::timestamptz))) AS last_activity,
      bool_or(c.connection_status = 'connected') AS whatsapp_connected
    FROM units u
    LEFT JOIN public.projects p ON p.user_id = u.member_id
    LEFT JOIN public.cost_code_budgets b ON b.project_id = p.id
    LEFT JOIN public.whatsapp_connections c ON c.user_id = u.member_id
    LEFT JOIN public.whatsapp_message_logs w ON w.user_id = u.member_id
    GROUP BY u.unit_id
  ),
  named AS (
    SELECT a.*,
      COALESCE(pr.full_name, pr.email) AS owner_name, pr.email AS owner_email,
      COALESCE(s.status, 'none') AS account_status
    FROM agg a
    LEFT JOIN public.profiles pr ON pr.user_id = a.owner_id
    LEFT JOIN public.user_subscriptions s ON s.user_id = a.owner_id
  ),
  filtered AS (
    SELECT * FROM named
    WHERE _search IS NULL OR _search = ''
       OR unit_name ILIKE '%' || _search || '%'
       OR COALESCE(owner_name, '') ILIKE '%' || _search || '%'
       OR COALESCE(owner_email, '') ILIKE '%' || _search || '%'
  )
  SELECT count(*)::int, COALESCE(jsonb_agg(t ORDER BY t.last_activity DESC NULLS LAST), '[]'::jsonb)
  INTO v_total, v
  FROM (SELECT * FROM filtered ORDER BY last_activity DESC NULLS LAST LIMIT v_lim OFFSET GREATEST(COALESCE(_offset, 0), 0)) t;

  RETURN jsonb_build_object('rows', v, 'page_count', v_total,
    'total', (SELECT count(*) FROM (SELECT DISTINCT unit_id FROM public.admin_unit_map()) z));
END $$;

-- 6) Firma detayı
CREATE OR REPLACE FUNCTION public.admin_company_detail(_unit_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  WITH members AS (SELECT * FROM public.admin_unit_map() WHERE unit_id = _unit_id)
  SELECT jsonb_build_object(
    'unit_id', _unit_id,
    'name', (SELECT max(unit_name) FROM members),
    'kind', (SELECT max(kind) FROM members),
    'created_at', (SELECT min(unit_created_at) FROM members),
    'owner', (
      SELECT jsonb_build_object('user_id', pr.user_id, 'name', pr.full_name, 'email', pr.email, 'plan', pr.plan)
      FROM public.profiles pr WHERE pr.user_id = (SELECT max(owner_id::text)::uuid FROM members)
    ),
    'users', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', pr.user_id, 'name', pr.full_name, 'email', pr.email,
        'title', pr.title, 'role', pr.role, 'plan', pr.plan, 'created_at', pr.created_at
      ) ORDER BY pr.created_at), '[]'::jsonb)
      FROM members m JOIN public.profiles pr ON pr.user_id = m.member_id
    ),
    'projects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'status', p.status,
        'profit_ready', EXISTS (SELECT 1 FROM public.cost_code_budgets b WHERE b.project_id = p.id),
        'last_snapshot_at', (SELECT max(s.created_at) FROM public.project_forecast_snapshots s WHERE s.project_id = p.id),
        'open_risks', (SELECT count(*) FROM public.project_risks r WHERE r.project_id = p.id AND r.status = 'open')
      ) ORDER BY p.created_at DESC), '[]'::jsonb)
      FROM members m JOIN public.projects p ON p.user_id = m.member_id
    ),
    'whatsapp', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'status', c.connection_status, 'mode', c.connection_mode,
        'number_masked', CASE WHEN c.connected_number IS NULL THEN NULL
          ELSE '••••' || right(c.connected_number, 4) END,
        'last_health_check', c.last_health_check, 'connected_at', c.connected_at
      )), '[]'::jsonb)
      FROM members m JOIN public.whatsapp_connections c ON c.user_id = m.member_id
    ),
    'ai', (
      SELECT jsonb_build_object(
        'last_run_at', max(i.generated_at),
        'insight_count', count(*),
        'model_version', max(i.model_version)
      )
      FROM members m JOIN public.ai_project_insights i ON i.user_id = m.member_id
    )
  ) INTO v;
  RETURN v;
END $$;

-- 7) Kullanıcılar
CREATE OR REPLACE FUNCTION public.admin_users(_search text DEFAULT NULL, _limit int DEFAULT 25, _offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_lim int := LEAST(GREATEST(COALESCE(_limit, 25), 1), 100);
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v FROM (
    SELECT pr.user_id, pr.full_name, pr.email, pr.title, pr.city, pr.role, pr.plan, pr.created_at,
           (SELECT max(unit_name) FROM public.admin_unit_map() um WHERE um.member_id = pr.user_id) AS company,
           COALESCE((SELECT s.status FROM public.user_subscriptions s WHERE s.user_id = pr.user_id ORDER BY s.updated_at DESC LIMIT 1), 'none') AS account_status,
           GREATEST(
             COALESCE((SELECT max(created_at) FROM public.projects p WHERE p.user_id = pr.user_id), 'epoch'::timestamptz),
             COALESCE((SELECT max(generated_at) FROM public.ai_project_insights i WHERE i.user_id = pr.user_id), 'epoch'::timestamptz)
           ) AS last_activity
    FROM public.profiles pr
    WHERE _search IS NULL OR _search = ''
       OR COALESCE(pr.full_name, '') ILIKE '%' || _search || '%'
       OR COALESCE(pr.email, '') ILIKE '%' || _search || '%'
    ORDER BY pr.created_at DESC
    LIMIT v_lim OFFSET GREATEST(COALESCE(_offset, 0), 0)
  ) t;
  RETURN jsonb_build_object('rows', v, 'total', (SELECT count(*) FROM public.profiles));
END $$;

-- 8) Projeler
CREATE OR REPLACE FUNCTION public.admin_projects(_search text DEFAULT NULL, _limit int DEFAULT 25, _offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_lim int := LEAST(GREATEST(COALESCE(_limit, 25), 1), 100);
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v FROM (
    SELECT p.id, p.name, p.status, p.created_at,
           (SELECT max(unit_name) FROM public.admin_unit_map() um WHERE um.member_id = p.user_id) AS company,
           EXISTS (SELECT 1 FROM public.cost_code_budgets b WHERE b.project_id = p.id) AS budget_ready,
           EXISTS (SELECT 1 FROM public.project_forecast_snapshots s WHERE s.project_id = p.id) AS snapshot_ready,
           (SELECT max(s.created_at) FROM public.project_forecast_snapshots s WHERE s.project_id = p.id) AS last_snapshot_at,
           (SELECT count(*) FROM public.project_risks r WHERE r.project_id = p.id AND r.status = 'open') AS open_risks
    FROM public.projects p
    WHERE _search IS NULL OR _search = '' OR COALESCE(p.name, '') ILIKE '%' || _search || '%'
    ORDER BY p.created_at DESC
    LIMIT v_lim OFFSET GREATEST(COALESCE(_offset, 0), 0)
  ) t;
  RETURN jsonb_build_object('rows', v, 'total', (SELECT count(*) FROM public.projects));
END $$;

-- 9) WhatsApp / Evolution operasyon görünümü (kimlik bilgisi ve session verisi hariç)
CREATE OR REPLACE FUNCTION public.admin_whatsapp(_limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_lim int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v FROM (
    SELECT c.id, c.connection_status AS status, c.connection_mode AS mode, c.last_health_check,
           c.connected_at, c.last_disconnected_at,
           CASE WHEN c.connected_number IS NULL THEN NULL ELSE '••••' || right(c.connected_number, 4) END AS number_masked,
           COALESCE(pr.full_name, pr.email) AS user_name,
           (SELECT max(unit_name) FROM public.admin_unit_map() um WHERE um.member_id = c.user_id) AS company,
           (SELECT max(l.sent_at) FROM public.whatsapp_message_logs l WHERE l.connection_id = c.id AND l.status <> 'failed') AS last_message_at,
           (SELECT l.failure_reason FROM public.whatsapp_message_logs l WHERE l.connection_id = c.id AND l.status = 'failed' ORDER BY l.created_at DESC LIMIT 1) AS last_error
    FROM public.whatsapp_connections c
    LEFT JOIN public.profiles pr ON pr.user_id = c.user_id
    ORDER BY c.updated_at DESC
    LIMIT v_lim OFFSET GREATEST(COALESCE(_offset, 0), 0)
  ) t;
  RETURN jsonb_build_object('rows', v, 'total', (SELECT count(*) FROM public.whatsapp_connections));
END $$;

-- 10) AI operasyonları (prompt / hassas içerik yok)
CREATE OR REPLACE FUNCTION public.admin_ai_operations(_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_lim int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v FROM (
    SELECT date_trunc('hour', i.generated_at) AS run_hour,
           max(i.generated_at) AS last_run_at,
           (SELECT max(unit_name) FROM public.admin_unit_map() um WHERE um.member_id = i.user_id) AS company,
           p.name AS project_name,
           count(*) AS insight_count,
           max(i.model_version) AS model_version,
           count(*) FILTER (WHERE i.status = 'failed') AS failed_count
    FROM public.ai_project_insights i
    LEFT JOIN public.projects p ON p.id = i.project_id
    GROUP BY date_trunc('hour', i.generated_at), i.user_id, p.name
    ORDER BY max(i.generated_at) DESC
    LIMIT v_lim
  ) t;
  RETURN jsonb_build_object('rows', v);
END $$;

-- 11) Sistem durumu (yalnızca gerçek son-çalışma kayıtlarından türetilir)
CREATE OR REPLACE FUNCTION public.admin_system_health()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'profit_engine_last_budget_at', (SELECT max(updated_at) FROM public.cost_code_budgets),
    'risk_engine_last_detect_at', (SELECT max(detected_at) FROM public.project_risks),
    'forecast_snapshot_last_at', (SELECT max(created_at) FROM public.project_forecast_snapshots),
    'agent_last_run_at', (SELECT max(generated_at) FROM public.ai_project_insights),
    'evolution_connections_total', (SELECT count(*) FROM public.whatsapp_connections),
    'evolution_connected', (SELECT count(*) FROM public.whatsapp_connections WHERE connection_status = 'connected'),
    'evolution_last_health_check', (SELECT max(last_health_check) FROM public.whatsapp_connections),
    'scheduler_last_send_at', (SELECT max(sent_at) FROM public.whatsapp_message_logs),
    'scheduler_failed_24h', (SELECT count(*) FROM public.whatsapp_message_logs WHERE status = 'failed' AND created_at > now() - interval '24 hours')
  ) INTO v;
  RETURN v;
END $$;

-- 12) Denetim kaydı listesi
CREATE OR REPLACE FUNCTION public.admin_audit_list(_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_lim int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO v FROM (
    SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
           COALESCE(pr.full_name, pr.email) AS admin_name
    FROM public.admin_audit_log a
    LEFT JOIN public.profiles pr ON pr.user_id = a.admin_user_id
    ORDER BY a.created_at DESC
    LIMIT v_lim
  ) t;
  RETURN jsonb_build_object('rows', v);
END $$;