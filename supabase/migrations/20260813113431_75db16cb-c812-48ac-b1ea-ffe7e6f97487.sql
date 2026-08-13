-- 1) Prevent students from tampering with grading fields on their submissions
CREATE OR REPLACE FUNCTION public.protect_submission_grading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_grader boolean;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = NEW.assignment_id AND a.created_by = auth.uid()
  ) INTO is_grader;

  IF is_grader THEN
    RETURN NEW;
  END IF;

  -- Non-grader (student) updates: grading columns are immutable
  NEW.score := OLD.score;
  NEW.feedback := OLD.feedback;
  NEW.graded_by := OLD.graded_by;
  NEW.graded_at := OLD.graded_at;
  NEW.status := OLD.status;
  NEW.student_id := OLD.student_id;
  NEW.assignment_id := OLD.assignment_id;

  -- Once graded, students cannot modify the submission at all
  IF OLD.graded_at IS NOT NULL OR OLD.score IS NOT NULL OR OLD.status = 'graded' THEN
    RAISE EXCEPTION 'Submission has already been graded and can no longer be modified';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_submission_grading_trg ON public.assignment_submissions;
CREATE TRIGGER protect_submission_grading_trg
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_submission_grading();

DROP POLICY IF EXISTS "Students can update own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can update own submissions"
ON public.assignment_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- 2) Only the payment flow (service role) may create university access grants
DROP POLICY IF EXISTS "Service can insert grants" ON public.university_access_grants;
REVOKE INSERT, UPDATE, DELETE ON public.university_access_grants FROM authenticated;
GRANT SELECT ON public.university_access_grants TO authenticated;
GRANT ALL ON public.university_access_grants TO service_role;

-- 3) Atomic AI credit consumption
CREATE OR REPLACE FUNCTION public.consume_ai_credits(_user_id uuid, _cost integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining integer;
BEGIN
  IF _cost IS NULL OR _cost < 0 THEN
    RAISE EXCEPTION 'Invalid credit cost';
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - _cost
  WHERE user_id = _user_id
    AND credits_remaining >= _cost
  RETURNING credits_remaining INTO remaining;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_credits(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer) TO service_role;