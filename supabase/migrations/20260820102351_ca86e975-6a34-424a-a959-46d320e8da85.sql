CREATE OR REPLACE FUNCTION public.assign_self_student_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_self_student_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_self_student_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_teacher_role(_user_id uuid, _school_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_school_admin(_school_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only a school admin of this school can grant the teacher role';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'teacher')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_teacher_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_teacher_role(uuid, uuid) TO authenticated;

GRANT INSERT ON public.user_roles TO service_role;