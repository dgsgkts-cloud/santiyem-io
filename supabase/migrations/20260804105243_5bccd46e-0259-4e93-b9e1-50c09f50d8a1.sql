CREATE OR REPLACE FUNCTION public.demo_purge_stock_movements(_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer; jwt_role text;
BEGIN
  jwt_role := COALESCE(
    current_setting('request.jwt.claim.role', true),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
  IF COALESCE(jwt_role, '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND NOT public.is_santiyem_admin() THEN
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