
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

CREATE OR REPLACE FUNCTION public.check_trial_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Trial expirations
  UPDATE public.profiles
  SET
    tier = 'tier_0',
    is_trial = false,
    credits_remaining = 15,
    tests_remaining = 10
  WHERE is_trial = true
    AND trial_ends_at < now();

  -- Paid subscription expirations
  UPDATE public.profiles
  SET
    tier = 'tier_0',
    credits_remaining = 15,
    tests_remaining = 10,
    subscription_ends_at = NULL
  WHERE subscription_ends_at IS NOT NULL
    AND subscription_ends_at < now()
    AND is_trial = false;
END;
$$;
