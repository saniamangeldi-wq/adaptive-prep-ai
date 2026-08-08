CREATE POLICY "Admins manage question figures"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'question-figures' AND public.has_role(auth.uid(), 'school_admin'))
WITH CHECK (bucket_id = 'question-figures' AND public.has_role(auth.uid(), 'school_admin'));