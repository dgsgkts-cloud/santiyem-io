-- Yönetici raporlarını yalnızca oturum açmış kullanıcılar çağırabilir;
-- fonksiyon içindeki yetki kontrolü ayrıca yönetici olmayanı reddeder.
REVOKE ALL ON FUNCTION public.admin_whoami() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_companies(text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_company_detail(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_users(text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_projects(text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_whatsapp(int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_operations(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_system_health() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_audit_list(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_log_action(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_whoami() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_companies(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_company_detail(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_projects(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_whatsapp(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_operations(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_list(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_action(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;