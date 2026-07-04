-- Sprint 12.1 P0-2: revoke direct UPDATE on profiles.role and profiles.plan
-- from client-facing roles. The existing prevent_profile_privilege_escalation
-- trigger remains as defence in depth; this column grant is the primary lock.

REVOKE UPDATE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;

-- Re-grant UPDATE on every user-editable column so the settings UI keeps working.
GRANT UPDATE (
  full_name,
  title,
  city,
  theme,
  updated_at
) ON public.profiles TO authenticated;

-- Backend/admin paths (edge functions using service_role, e.g. iyzico-callback)
-- retain full access.
GRANT ALL ON public.profiles TO service_role;

-- Sanity: fail the migration if authenticated still has UPDATE on role/plan.
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(column_name, ',') INTO bad
  FROM information_schema.column_privileges
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND grantee = 'authenticated'
    AND privilege_type = 'UPDATE'
    AND column_name IN ('role','plan');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Sprint 12.1 P0-2 guard failed: authenticated still has UPDATE on %', bad;
  END IF;
END $$;