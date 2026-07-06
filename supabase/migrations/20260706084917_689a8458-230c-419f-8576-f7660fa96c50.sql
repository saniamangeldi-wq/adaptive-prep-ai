
CREATE OR REPLACE FUNCTION public.enforce_paid_tier_has_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_school_affiliated boolean;
BEGIN
  -- Keep trial and subscription expiry mutually exclusive & consistent
  IF NEW.is_trial = true THEN
    NEW.subscription_ends_at := NULL;
  ELSIF NEW.subscription_ends_at IS NOT NULL THEN
    NEW.trial_ends_at := NULL;
  END IF;

  -- Only paid tiers need an expiry check
  IF NEW.tier IN ('tier_1', 'tier_2', 'tier_3') THEN
    -- School-affiliated students get tier from their school; exempt them
    SELECT EXISTS (
      SELECT 1 FROM public.school_members
      WHERE user_id = NEW.user_id AND status = 'active'
    ) INTO is_school_affiliated;

    IF NOT is_school_affiliated
       AND NEW.is_trial = false
       AND NEW.subscription_ends_at IS NULL THEN
      RAISE EXCEPTION 'Paid tier % requires either is_trial=true with trial_ends_at, or a subscription_ends_at. Refusing to leave user % in an unbounded paid state.', NEW.tier, NEW.user_id;
    END IF;

    -- If somehow trial is on but no end date, also block
    IF NEW.is_trial = true AND NEW.trial_ends_at IS NULL THEN
      RAISE EXCEPTION 'Trial user % on tier % must have trial_ends_at set.', NEW.user_id, NEW.tier;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_paid_tier_has_expiry_trigger ON public.profiles;
CREATE TRIGGER enforce_paid_tier_has_expiry_trigger
BEFORE INSERT OR UPDATE OF tier, is_trial, trial_ends_at, subscription_ends_at
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_paid_tier_has_expiry();
