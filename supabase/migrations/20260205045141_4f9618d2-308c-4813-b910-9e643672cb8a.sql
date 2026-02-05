-- Update the handle_new_user function to give trial users 200 questions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
    200,       -- 200 practice questions for trial period
    0          -- Questions used today starts at 0
  );
  RETURN NEW;
END;
$$;