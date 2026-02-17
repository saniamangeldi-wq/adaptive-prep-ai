
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
    'tier_2',
    true,
    now(),
    now() + interval '7 days',
    75,
    150,
    0
  );
  RETURN NEW;
END;
$function$;

-- Also update check_trial_expiration to use new tier_0 limit
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
    credits_remaining = 15,
    tests_remaining = 10
  WHERE is_trial = true 
    AND trial_ends_at < now();
END;
$function$;
