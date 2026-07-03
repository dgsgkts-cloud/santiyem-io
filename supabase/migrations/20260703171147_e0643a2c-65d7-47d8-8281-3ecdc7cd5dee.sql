
-- Allow superuser/postgres session (used by migrations) to change privileged fields too
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    NEW.plan := OLD.plan;
  END IF;

  RETURN NEW;
END;
$function$;

UPDATE public.profiles
SET role = 'free'
WHERE role = 'admin'
  AND user_id <> 'e353aaa2-c333-4700-9236-10252397869a';
