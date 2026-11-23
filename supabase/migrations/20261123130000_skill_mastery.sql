-- Skill mastery: one rating per student per Digital SAT skill domain.
--
-- Rating is on a logit scale (0 = 50% chance on a medium question). After each
-- answered question it moves by an Elo-style step:
--   expected = 1 / (1 + exp(difficulty - rating))   -- easy -1, normal 0, hard 1
--   rating  += k * (correct - expected)              -- k shrinks as attempts grow
-- Students can read their own rows; their tutors/teachers can read them too.
-- Writes only happen through record_skill_results(), once per test attempt.

CREATE TABLE IF NOT EXISTS public.skill_mastery (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (skill IN (
    'information_ideas', 'craft_structure', 'expression_ideas', 'standard_english',
    'algebra', 'advanced_math', 'data_analysis', 'geometry_trig')),
  section text NOT NULL CHECK (section IN ('math', 'reading_writing')),
  rating double precision NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill)
);

ALTER TABLE public.skill_mastery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own skill mastery" ON public.skill_mastery;
CREATE POLICY "Students can view own skill mastery"
  ON public.skill_mastery FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tutors and teachers can view their students' skill mastery" ON public.skill_mastery;
CREATE POLICY "Tutors and teachers can view their students' skill mastery"
  ON public.skill_mastery FOR SELECT
  USING (public.is_tutor_of_student(auth.uid(), user_id) OR public.is_teacher_of_student(auth.uid(), user_id));

REVOKE ALL ON public.skill_mastery FROM anon;
GRANT SELECT ON public.skill_mastery TO authenticated;

-- Which attempts have already been counted. No policies: clients can't read
-- or delete rows, so an attempt can't be replayed to inflate mastery.
CREATE TABLE IF NOT EXISTS public.skill_mastery_attempts (
  attempt_id uuid PRIMARY KEY REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.skill_mastery_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.skill_mastery_attempts FROM anon, authenticated;

-- p_results: [{"skill": "algebra", "difficulty": "hard", "correct": true}, ...]
-- Returns the number of answers applied (0 if the attempt was already counted).
CREATE OR REPLACE FUNCTION public.record_skill_results(p_attempt_id uuid, p_results jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_completed timestamptz;
  v_item jsonb;
  v_skill text;
  v_section text;
  v_b double precision;
  v_correct integer;
  v_rating double precision;
  v_attempts integer;
  v_expected double precision;
  v_k double precision;
  v_applied integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array' OR jsonb_array_length(p_results) > 200 THEN
    RAISE EXCEPTION 'p_results must be an array of at most 200 answers' USING ERRCODE = '22023';
  END IF;

  SELECT user_id, completed_at INTO v_owner, v_completed
  FROM public.test_attempts WHERE id = p_attempt_id;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = '42501';
  END IF;
  IF v_completed IS NULL THEN
    RAISE EXCEPTION 'Attempt is not completed yet' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.skill_mastery_attempts (attempt_id, user_id)
  VALUES (p_attempt_id, v_uid)
  ON CONFLICT (attempt_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_results) LOOP
    v_skill := v_item->>'skill';
    v_section := CASE
      WHEN v_skill IN ('information_ideas', 'craft_structure', 'expression_ideas', 'standard_english') THEN 'reading_writing'
      WHEN v_skill IN ('algebra', 'advanced_math', 'data_analysis', 'geometry_trig') THEN 'math'
      ELSE NULL
    END;
    CONTINUE WHEN v_section IS NULL OR jsonb_typeof(v_item->'correct') <> 'boolean';

    v_b := CASE v_item->>'difficulty' WHEN 'easy' THEN -1 WHEN 'hard' THEN 1 ELSE 0 END;
    v_correct := CASE WHEN (v_item->>'correct')::boolean THEN 1 ELSE 0 END;

    INSERT INTO public.skill_mastery (user_id, skill, section)
    VALUES (v_uid, v_skill, v_section)
    ON CONFLICT (user_id, skill) DO NOTHING;

    SELECT rating, attempts INTO v_rating, v_attempts
    FROM public.skill_mastery WHERE user_id = v_uid AND skill = v_skill FOR UPDATE;

    v_expected := 1 / (1 + exp(v_b - v_rating));
    v_k := greatest(0.08, 0.6 / sqrt(1 + v_attempts / 5.0));

    UPDATE public.skill_mastery
    SET rating = least(4, greatest(-4, v_rating + v_k * (v_correct - v_expected))),
        attempts = attempts + 1,
        correct = correct + v_correct,
        updated_at = now()
    WHERE user_id = v_uid AND skill = v_skill;

    v_applied := v_applied + 1;
  END LOOP;

  RETURN v_applied;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_skill_results(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_skill_results(uuid, jsonb) TO authenticated;
