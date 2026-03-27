CREATE POLICY "Students can view their tutor profile"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tutor_students
    WHERE tutor_students.tutor_id = profiles.user_id
      AND tutor_students.student_id = auth.uid()
  )
);