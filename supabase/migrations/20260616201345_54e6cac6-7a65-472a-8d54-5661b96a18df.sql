
-- 1) Replace is_same_school-based policies with role-checked variants

DROP POLICY IF EXISTS "Teachers can view school student checkpoints" ON public.performance_checkpoints;
CREATE POLICY "Teachers can view their students checkpoints"
ON public.performance_checkpoints FOR SELECT
USING (
  public.is_teacher_of_student(auth.uid(), user_id)
  OR (public.has_role(auth.uid(), 'school_admin') AND public.is_same_school(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Teachers can view school student verbal progress" ON public.verbal_topic_progress;
CREATE POLICY "Teachers can view their students verbal progress"
ON public.verbal_topic_progress FOR SELECT
USING (
  public.is_teacher_of_student(auth.uid(), user_id)
  OR (public.has_role(auth.uid(), 'school_admin') AND public.is_same_school(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "School admins can view school students portfolios" ON public.student_portfolios;
CREATE POLICY "School admins can view school students portfolios"
ON public.student_portfolios FOR SELECT
USING (public.has_role(auth.uid(), 'school_admin') AND public.is_same_school(auth.uid(), student_id));

DROP POLICY IF EXISTS "School admins can view school students voice usage" ON public.voice_usage;
CREATE POLICY "School admins can view school students voice usage"
ON public.voice_usage FOR SELECT
USING (public.has_role(auth.uid(), 'school_admin') AND public.is_same_school(auth.uid(), user_id));

DROP POLICY IF EXISTS "Teachers can view school student lessons" ON public.video_lessons;
CREATE POLICY "Teachers can view their students lessons"
ON public.video_lessons FOR SELECT
USING (
  public.is_teacher_of_student(auth.uid(), user_id)
  OR (public.has_role(auth.uid(), 'school_admin') AND public.is_same_school(auth.uid(), user_id))
);

-- 2) Lock down school_members self-join: require a valid invite code

CREATE OR REPLACE FUNCTION public.validate_school_invite_code(_school_id uuid, _code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = _school_id
      AND invite_code IS NOT NULL
      AND upper(invite_code) = upper(_code)
  );
$$;

CREATE OR REPLACE FUNCTION public.join_school_with_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_school uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id INTO target_school FROM public.schools
   WHERE invite_code IS NOT NULL AND upper(invite_code) = upper(_code)
   LIMIT 1;
  IF target_school IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  INSERT INTO public.school_members (school_id, user_id, role, status)
  VALUES (target_school, auth.uid(), 'student', 'active')
  ON CONFLICT DO NOTHING;
  RETURN target_school;
END;
$$;

REVOKE ALL ON FUNCTION public.join_school_with_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_school_with_code(text) TO authenticated;

DROP POLICY IF EXISTS "Users can self-join schools as student" ON public.school_members;
-- Self-join now only allowed via the join_school_with_code SECURITY DEFINER function above.

-- 3) student_points DELETE policy
CREATE POLICY "Tutors can delete their own student_points rows"
ON public.student_points FOR DELETE
USING (auth.uid() = tutor_id AND public.has_role(auth.uid(), 'tutor'));

-- 4) conversation_attachments UPDATE policy (owner-only)
CREATE POLICY "Users can update their own attachments"
ON public.conversation_attachments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5) duplicate_account_flags: explicit SELECT for school admins so the table has at least one policy
CREATE POLICY "School admins can view duplicate account flags"
ON public.duplicate_account_flags FOR SELECT
USING (public.has_role(auth.uid(), 'school_admin'));
