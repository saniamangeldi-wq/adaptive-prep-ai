
-- 1. duplicate_account_flags: remove broad school_admin access; service role bypasses RLS
DROP POLICY IF EXISTS "Admins can view all flags" ON public.duplicate_account_flags;
DROP POLICY IF EXISTS "Admins can update flags" ON public.duplicate_account_flags;

-- 2. join_requests: add DELETE policies so PII can be cleaned up after processing
CREATE POLICY "Students can delete own requests"
  ON public.join_requests FOR DELETE
  USING (auth.uid() = student_user_id);

CREATE POLICY "Tutors can delete requests for them"
  ON public.join_requests FOR DELETE
  USING (target_type = 'tutor' AND auth.uid() = target_id);

CREATE POLICY "School admins can delete school requests"
  ON public.join_requests FOR DELETE
  USING (
    target_type = 'school'
    AND EXISTS (
      SELECT 1 FROM public.school_members
      WHERE school_members.school_id = join_requests.target_id
        AND school_members.user_id = auth.uid()
        AND school_members.role = 'school_admin'
    )
  );

-- 3. student_points: tighten insert to verified tutors only
DROP POLICY IF EXISTS "Tutors can create student points" ON public.student_points;
CREATE POLICY "Tutors can create student points"
  ON public.student_points FOR INSERT
  WITH CHECK (
    auth.uid() = tutor_id
    AND public.has_role(auth.uid(), 'tutor'::user_role)
  );

-- 4. portfolios bucket: allow school admins to read files for students in their school
CREATE POLICY "School admins can view their school students portfolio files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'portfolios'
    AND public.is_same_school(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 5. generated-documents public bucket: stop broad listing, scope SELECT to owner
DROP POLICY IF EXISTS "Generated documents are publicly readable" ON storage.objects;
CREATE POLICY "Users can view their own generated documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'generated-documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 6. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_deck_card_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_tutor_invite_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_trial_expiration() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_duplicate_accounts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upgrade_student_to_tutor_tier(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_admin_invite_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_change() FROM anon, authenticated;
