
-- Fix: Add UPDATE policies for private storage buckets restricted to file owner
CREATE POLICY "Owners can update their conversation uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'conversation-uploads' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'conversation-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update their portfolio files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix: student_points UPDATE policy must also verify current tutor role
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='student_points' AND cmd='UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.student_points', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "Tutors can update their own student_points rows"
ON public.student_points FOR UPDATE TO authenticated
USING (auth.uid() = tutor_id AND public.has_role(auth.uid(), 'tutor'))
WITH CHECK (auth.uid() = tutor_id AND public.has_role(auth.uid(), 'tutor'));

-- Fix: Remove self-update on user_roles to prevent any role mutation by users
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND cmd IN ('UPDATE','INSERT')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_roles', pol.policyname);
  END LOOP;
END$$;
-- Note: SELECT policies retained. Role assignment now must happen via service_role/triggers only.
