-- Add columns for flashcard daily tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS flashcards_created_today integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS flashcards_reset_at timestamp with time zone;

-- Update the handle_new_user function with correct trial limits
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
    tests_remaining,
    questions_used_today
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
    100,       -- Daily credits limit for trial
    2,         -- 2 practice tests TOTAL for entire trial period
    0          -- Questions used today starts at 0
  );
  RETURN NEW;
END;
$function$;

-- Also update existing trial users to have correct limits
UPDATE public.profiles
SET 
  tests_remaining = 2,
  credits_remaining = 100,
  questions_used_today = 0,
  flashcards_created_today = 0
WHERE is_trial = true;