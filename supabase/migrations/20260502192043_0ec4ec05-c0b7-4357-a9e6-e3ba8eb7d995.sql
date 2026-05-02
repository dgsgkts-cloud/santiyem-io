
-- Fix: prevent users from self-upgrading their plan or role.
-- Strategy: keep the existing UPDATE policy but add a BEFORE UPDATE trigger
-- that reverts changes to privileged columns unless the caller is the
-- service_role (used by payment edge functions).

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (edge functions using service key) to change anything.
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For all other callers, force privileged columns to keep their old values.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    NEW.plan := OLD.plan;
  END IF;
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    NEW.subscription_status := OLD.subscription_status;
  END IF;
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;
  IF NEW.subscription_ends_at IS DISTINCT FROM OLD.subscription_ends_at THEN
    NEW.subscription_ends_at := OLD.subscription_ends_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Fix: restrict signed-contracts INSERT so anonymous uploaders can only
-- write into a folder named after a real, non-expired signature_request id.
DROP POLICY IF EXISTS "Anyone can upload signed contracts" ON storage.objects;

CREATE POLICY "Signed contract uploads require valid request"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'signed-contracts'
  AND EXISTS (
    SELECT 1 FROM public.contract_signature_requests csr
    WHERE csr.id::text = (storage.foldername(name))[1]
      AND (csr.deadline IS NULL OR csr.deadline >= CURRENT_DATE)
  )
);
