
CREATE OR REPLACE FUNCTION public.get_project_name_by_qr_token(_token text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name
  FROM public.projects p
  JOIN public.project_qr_codes q ON q.project_id = p.id
  WHERE q.token = _token
  LIMIT 1
$$;
