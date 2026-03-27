CREATE OR REPLACE FUNCTION public.upgrade_student_to_tutor_tier(_student_id uuid, _tutor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tutor_tier pricing_tier;
  student_tier pricing_tier;
  student_credits int;
  student_tests int;
  student_trial bool;
BEGIN
  -- Get tutor's tier
  SELECT tier INTO tutor_tier FROM profiles WHERE user_id = _tutor_id;
  IF tutor_tier IS NULL THEN RETURN; END IF;

  -- Map tutor tier to student tier and limits
  -- Solo (tier_1) -> Basic (tier_1): 30 questions/day, 20 tests/month
  -- Professional (tier_2) -> Pro (tier_2): 100 questions/day, 300 tests/month
  -- Business (tier_3) -> Elite (tier_3): 200 credits/day, 1000 tests/month
  CASE tutor_tier
    WHEN 'tier_1' THEN
      student_tier := 'tier_1';
      student_credits := 30;
      student_tests := 20;
    WHEN 'tier_2' THEN
      student_tier := 'tier_2';
      student_credits := 100;
      student_tests := 300;
    WHEN 'tier_3' THEN
      student_tier := 'tier_3';
      student_credits := 200;
      student_tests := 1000;
    ELSE
      student_tier := 'tier_0';
      student_credits := 15;
      student_tests := 10;
  END CASE;

  UPDATE profiles
  SET tier = student_tier,
      credits_remaining = student_credits,
      tests_remaining = student_tests,
      is_trial = false,
      trial_ends_at = NULL
  WHERE user_id = _student_id;
END;
$$;