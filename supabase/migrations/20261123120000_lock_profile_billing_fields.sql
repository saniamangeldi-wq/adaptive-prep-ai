-- Security fix: students could change their own plan and quotas.
--
-- The "Users can update their own profile" RLS policy lets a signed-in user
-- update any column of their own row, and the only column guard protected
-- `role`. From the browser console a user could set tier = 'tier_3', a far-off
-- subscription_ends_at and unlimited credits_remaining.
--
-- This migration:
--   1. Locks billing/quota columns against changes made by client roles
--      (anon, authenticated). service_role (stripe-webhook, the AI functions'
--      admin clients) and SECURITY DEFINER functions owned by postgres
--      (handle_new_user, check_trial_expiration, consume_ai_credits) are
--      unaffected, because they run as a different current_user.
--   2. Adds consume_tests() so the test pages can still decrement their quota.
-- AI credits are already deducted atomically by consume_ai_credits(uuid, int),
-- service-role only (migration 20260813113431).

-- 1. Column guard -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_profile_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Deliberately SECURITY INVOKER: current_user is the role that issued the
  -- statement, or the owner of the SECURITY DEFINER function that issued it.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Client-side fallback profile creation (AuthContext) gets exactly the
    -- same 7-day trial as handle_new_user, whatever values it sent.
    NEW.tier := 'tier_2';
    NEW.is_trial := true;
    NEW.trial_started_at := now();
    NEW.trial_ends_at := now() + interval '7 days';
    NEW.subscription_ends_at := NULL;
    NEW.credits_remaining := 75;
    NEW.credits_reset_at := NULL;
    NEW.tests_remaining := 150;
    NEW.tests_reset_at := NULL;
    NEW.questions_used_today := 0;
    NEW.questions_reset_at := NULL;
    NEW.founding_member := false;
    NEW.abandon_warnings := 0;
    RETURN NEW;
  END IF;

  -- UPDATE: silently keep the old values (same approach as the existing
  -- prevent_profile_role_change trigger), so other columns in the same
  -- update (name, language, ...) still save.
  NEW.tier := OLD.tier;
  NEW.is_trial := OLD.is_trial;
  NEW.trial_started_at := OLD.trial_started_at;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.subscription_ends_at := OLD.subscription_ends_at;
  NEW.credits_remaining := OLD.credits_remaining;
  NEW.credits_reset_at := OLD.credits_reset_at;
  NEW.tests_remaining := OLD.tests_remaining;
  NEW.tests_reset_at := OLD.tests_reset_at;
  NEW.questions_used_today := OLD.questions_used_today;
  NEW.questions_reset_at := OLD.questions_reset_at;
  NEW.founding_member := OLD.founding_member;
  NEW.abandon_warnings := OLD.abandon_warnings;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_billing_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_billing_fields ON public.profiles;
-- Name sorts after enforce_paid_tier_has_expiry_trigger, so that check still
-- sees (and rejects) unbounded paid tiers before this guard reverts them.
CREATE TRIGGER guard_profile_billing_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_billing_fields();

-- 2. Test quota decrement -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.consume_tests(p_count integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_remaining integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_count IS NULL OR p_count < 0 OR p_count > 1000 THEN
    RAISE EXCEPTION 'Invalid test count %', p_count USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET tests_remaining = GREATEST(0, tests_remaining - p_count)
  WHERE user_id = v_uid
  RETURNING tests_remaining INTO v_remaining;

  RETURN v_remaining;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_tests(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_tests(integer) TO authenticated, service_role;
