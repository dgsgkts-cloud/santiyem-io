REVOKE ALL ON FUNCTION public.pi_setup_project_budget(text, numeric, numeric, numeric, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pi_project_setup_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pi_setup_project_budget(text, numeric, numeric, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pi_project_setup_summary(text) TO authenticated;