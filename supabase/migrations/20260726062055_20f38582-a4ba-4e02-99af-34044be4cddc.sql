
-- 1) Drop over-broad school_admin SELECT policy on duplicate_account_flags
DROP POLICY IF EXISTS "School admins can view duplicate account flags" ON public.duplicate_account_flags;

-- 2) Prevent non-service inserts/updates from setting sat_tests.is_official = true
CREATE OR REPLACE FUNCTION public.enforce_sat_tests_is_official()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    NEW.is_official := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_sat_tests_is_official_ins ON public.sat_tests;
DROP TRIGGER IF EXISTS enforce_sat_tests_is_official_upd ON public.sat_tests;

CREATE TRIGGER enforce_sat_tests_is_official_ins
BEFORE INSERT ON public.sat_tests
FOR EACH ROW EXECUTE FUNCTION public.enforce_sat_tests_is_official();

CREATE TRIGGER enforce_sat_tests_is_official_upd
BEFORE UPDATE OF is_official ON public.sat_tests
FOR EACH ROW EXECUTE FUNCTION public.enforce_sat_tests_is_official();
