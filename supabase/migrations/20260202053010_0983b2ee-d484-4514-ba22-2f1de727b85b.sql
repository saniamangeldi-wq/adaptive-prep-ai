-- Add tier_0 to the pricing_tier enum
ALTER TYPE public.pricing_tier ADD VALUE IF NOT EXISTS 'tier_0' BEFORE 'tier_1';

-- Add trial-related columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS questions_used_today integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS questions_reset_at timestamp with time zone;

-- Update handle_new_user function to start new users with trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    avatar_url,
    tier,
    is_trial,
    trial_started_at,
    trial_ends_at,
    credits_remaining,
    tests_remaining
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'tier_2',  -- Start with Tier 2 during trial
    true,      -- Mark as trial
    now(),     -- Trial started
    now() + interval '7 days',  -- Trial ends in 7 days
    100,       -- Trial credits (tighter than normal tier 2)
    50         -- Trial tests (tighter limit)
  );
  RETURN NEW;
END;
$function$;

-- Create function to check and expire trials (run daily via cron)
CREATE OR REPLACE FUNCTION public.check_trial_expiration()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET 
    tier = 'tier_0',
    is_trial = false,
    credits_remaining = 20,
    tests_remaining = 10
  WHERE is_trial = true 
    AND trial_ends_at < now();
END;
$function$;