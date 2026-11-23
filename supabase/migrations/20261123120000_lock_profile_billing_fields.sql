-- Security fix: students could change their own plan and quotas.
--
-- The "Users can update their own profile" RLS policy lets a signed-in user
-- update any column of their own row, and the only column guard protected
-- `role`. From the browser console a user could set tier = 'tier_3', a far-off
-- subscription_ends_at and unlimited credits_remaining.
--
-- This migration:
--   1. Locks billing/quota columns against changes made by client roles
--      (anon, authenticated). service_role and SECURITY DEFINER functions owned
--      by postgres (handle_new_user, check_trial_expiration, the RPCs below)
--      are unaffected, because they run as a different current_user.
--   2. Adds consume_ai_credits() so edge functions deduct credits in one atomic
--      statement (with the daily reset) instead of read-then-write.
--   3. Adds refund_ai_credits() (service_role only) for failed AI calls.
--   4. Adds consume_tests() so the test pages can still decrement their quota.

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

-- 2. Atomic AI credit consumption -------------------------------------------

-- Returns credits left after the deduction, or -1 if the user doesn't have
-- enough. Applies the daily (UTC) reset first. Limits match the old
-- TIER_CREDIT_LIMITS in supabase/functions/student-chat.
CREATE OR REPLACE FUNCTION public.consume_ai_credits(p_cost integer DEFAULT 1)
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
  IF p_cost IS NULL OR p_cost < 1 OR p_cost > 50 THEN
    RAISE EXCEPTION 'Invalid credit cost %', p_cost USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET credits_remaining = CASE
        WHEN is_trial THEN 75
        WHEN tier = 'tier_1' THEN 40
        WHEN tier = 'tier_2' THEN 100
        WHEN tier = 'tier_3' THEN 200
        ELSE 15
      END,
      credits_reset_at = now()
  WHERE user_id = v_uid
    AND (credits_reset_at IS NULL
         OR (credits_reset_at AT TIME ZONE 'UTC')::date < (now() AT TIME ZONE 'UTC')::date);

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - p_cost
  WHERE user_id = v_uid
    AND credits_remaining >= p_cost
  RETURNING credits_remaining INTO v_remaining;

  RETURN COALESCE(v_remaining, -1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_ai_credits(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_credits(integer) TO authenticated, service_role;

-- 3. Refund for failed AI calls (server only) --------------------------------

CREATE OR REPLACE FUNCTION public.refund_ai_credits(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 50 THEN
    RAISE EXCEPTION 'Invalid refund amount %', p_amount USING ERRCODE = '22023';
  END IF;
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + p_amount
  WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_ai_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_credits(uuid, integer) TO service_role;

-- 4. Test quota decrement -----------------------------------------------------

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
