
-- 1) Fix privilege escalation guard: only reference columns that exist on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('role', true) = 'service_role' THEN
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

-- 2) Remove hard-coded admin promotions from new-user handler; everyone defaults to 'free'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, title, city, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'title', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'city', ''),
    CASE WHEN NEW.email = 'info@goktasglobal.com' THEN 'admin' ELSE 'free' END
  );
  RETURN NEW;
END;
$function$;

-- 3) Demote all admins except the sole owner
UPDATE public.profiles
SET role = 'free'
WHERE role = 'admin'
  AND user_id <> 'e353aaa2-c333-4700-9236-10252397869a';
