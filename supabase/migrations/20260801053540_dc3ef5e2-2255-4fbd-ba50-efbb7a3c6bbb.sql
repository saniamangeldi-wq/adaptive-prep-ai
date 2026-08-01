-- 1. sat_tests: prevent non-admins from publishing official tests
DROP POLICY IF EXISTS "Authenticated users can create tests" ON public.sat_tests;
CREATE POLICY "Authenticated users can create tests"
ON public.sat_tests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (is_official = false OR is_official IS NULL)
);

DROP POLICY IF EXISTS "Creators can update their tests" ON public.sat_tests;
CREATE POLICY "Creators can update their tests"
ON public.sat_tests FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (
  auth.uid() = created_by
  AND (is_official = false OR is_official IS NULL)
);

-- 2. assignments: require teacher/tutor role + relationship
DROP POLICY IF EXISTS "Teachers and tutors can create assignments" ON public.assignments;
CREATE POLICY "Teachers and tutors can create assignments"
ON public.assignments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'tutor')
    OR public.has_role(auth.uid(), 'school_admin')
  )
  AND (
    (school_id IS NOT NULL AND public.is_school_member(school_id, auth.uid()))
    OR (tutor_id IS NOT NULL AND tutor_id = auth.uid())
  )
);

-- 3. grades: require an actual teaching/tutoring relationship
DROP POLICY IF EXISTS "Teachers can create grades" ON public.grades;
CREATE POLICY "Teachers can create grades"
ON public.grades FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = graded_by
  AND (
    public.is_teacher_of_student(auth.uid(), student_id)
    OR public.is_tutor_of_student(auth.uid(), student_id)
    OR (school_id IS NOT NULL AND public.is_school_admin(school_id, auth.uid()))
  )
);

DROP POLICY IF EXISTS "Graders can update grades" ON public.grades;
CREATE POLICY "Graders can update grades"
ON public.grades FOR UPDATE TO authenticated
USING (auth.uid() = graded_by)
WITH CHECK (
  auth.uid() = graded_by
  AND (
    public.is_teacher_of_student(auth.uid(), student_id)
    OR public.is_tutor_of_student(auth.uid(), student_id)
    OR (school_id IS NOT NULL AND public.is_school_admin(school_id, auth.uid()))
  )
);

-- 4. student_levels: remove global leaderboard read; cohort-scoped policies remain
DROP POLICY IF EXISTS "Authenticated users can view leaderboard" ON public.student_levels;