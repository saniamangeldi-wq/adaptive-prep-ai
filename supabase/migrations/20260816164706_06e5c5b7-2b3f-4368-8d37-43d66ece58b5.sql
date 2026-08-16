
CREATE OR REPLACE FUNCTION public.upgrade_student_to_tutor_tier(_student_id uuid, _tutor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Students joining a tutor get the limited plan: AI chat + flashcards only.
  -- Full access (practice tests, SAT tests, university tools) requires the paid Elite upgrade.
  UPDATE profiles
  SET tier = 'tier_0',
      credits_remaining = GREATEST(credits_remaining, 100),
      tests_remaining = 0,
      is_trial = false,
      trial_ends_at = NULL
  WHERE user_id = _student_id
    AND tier <> 'tier_3';
END;
$$;
