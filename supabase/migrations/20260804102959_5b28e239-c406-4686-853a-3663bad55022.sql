CREATE TABLE IF NOT EXISTS public.demo_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  company_name text NOT NULL DEFAULT 'Şantiyem AI Demo İnşaat A.Ş.',
  team_id uuid REFERENCES public.office_teams(id) ON DELETE SET NULL,
  is_demo_account boolean NOT NULL DEFAULT true,
  first_login_at timestamptz,
  expires_at timestamptz,
  last_login_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  access_days integer NOT NULL DEFAULT 7,
  seeded_at timestamptz,
  reset_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demo_accounts TO authenticated;
GRANT ALL ON public.demo_accounts TO service_role;

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_santiyem_admin(_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _user AND p.role = 'admin');
$$;

DROP POLICY IF EXISTS "Demo user can read own demo record" ON public.demo_accounts;
CREATE POLICY "Demo user can read own demo record" ON public.demo_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_santiyem_admin());

DROP POLICY IF EXISTS "Admins can update demo records" ON public.demo_accounts;
CREATE POLICY "Admins can update demo records" ON public.demo_accounts
  FOR UPDATE TO authenticated USING (public.is_santiyem_admin()) WITH CHECK (public.is_santiyem_admin());

CREATE OR REPLACE FUNCTION public.is_demo_user(_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.demo_accounts d WHERE d.user_id = _user AND d.is_demo_account);
$$;

CREATE OR REPLACE FUNCTION public.demo_row_to_json(d public.demo_accounts)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'user_id', d.user_id,
    'email', d.email,
    'company_name', d.company_name,
    'team_id', d.team_id,
    'is_demo_account', d.is_demo_account,
    'first_login_at', d.first_login_at,
    'expires_at', d.expires_at,
    'last_login_at', d.last_login_at,
    'is_active', d.is_active,
    'access_days', d.access_days,
    'seeded_at', d.seeded_at,
    'reset_count', d.reset_count,
    'expired', (d.expires_at IS NOT NULL AND d.expires_at < now()),
    'blocked', ((NOT d.is_active) OR (d.expires_at IS NOT NULL AND d.expires_at < now()))
  );
$$;

CREATE OR REPLACE FUNCTION public.demo_account_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.demo_accounts;
BEGIN
  SELECT * INTO d FROM public.demo_accounts WHERE user_id = auth.uid();
  IF d.user_id IS NULL THEN RETURN jsonb_build_object('is_demo_account', false); END IF;
  RETURN public.demo_row_to_json(d);
END;
$$;

CREATE OR REPLACE FUNCTION public.demo_register_login()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.demo_accounts;
BEGIN
  UPDATE public.demo_accounts SET
    first_login_at = COALESCE(first_login_at, now()),
    expires_at = COALESCE(expires_at, now() + (access_days || ' days')::interval),
    last_login_at = now(),
    updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING * INTO d;
  IF d.user_id IS NULL THEN RETURN jsonb_build_object('is_demo_account', false); END IF;
  RETURN public.demo_row_to_json(d);
END;
$$;

CREATE OR REPLACE FUNCTION public.demo_admin_update(_user uuid, _extend_days integer DEFAULT NULL, _is_active boolean DEFAULT NULL, _restart boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.demo_accounts;
BEGIN
  IF NOT public.is_santiyem_admin() THEN
    RAISE EXCEPTION 'Bu işlem için yönetici yetkisi gerekir.';
  END IF;
  UPDATE public.demo_accounts SET
    is_active = COALESCE(_is_active, is_active),
    first_login_at = CASE WHEN _restart THEN NULL ELSE first_login_at END,
    expires_at = CASE
      WHEN _restart THEN NULL
      WHEN _extend_days IS NOT NULL THEN COALESCE(GREATEST(expires_at, now()), now()) + (_extend_days || ' days')::interval
      ELSE expires_at END,
    updated_at = now()
  WHERE user_id = _user
  RETURNING * INTO d;
  IF d.user_id IS NULL THEN RAISE EXCEPTION 'Demo hesabı bulunamadı.'; END IF;
  RETURN public.demo_row_to_json(d);
END;
$$;

CREATE OR REPLACE FUNCTION public.demo_purge_stock_movements(_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF current_user <> 'service_role' AND NOT public.is_santiyem_admin() THEN
    RAISE EXCEPTION 'Bu işlem için yönetici yetkisi gerekir.';
  END IF;
  IF NOT public.is_demo_user(_user) THEN
    RAISE EXCEPTION 'Sadece demo hesabı verileri sıfırlanabilir.';
  END IF;
  ALTER TABLE public.stock_movements DISABLE TRIGGER stock_movements_no_update;
  DELETE FROM public.stock_movements WHERE user_id = _user;
  GET DIAGNOSTICS n = ROW_COUNT;
  ALTER TABLE public.stock_movements ENABLE TRIGGER stock_movements_no_update;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_purge_stock_movements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_purge_stock_movements(uuid) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_account_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.demo_register_login() TO authenticated;
GRANT EXECUTE ON FUNCTION public.demo_admin_update(uuid, integer, boolean, boolean) TO authenticated, service_role;