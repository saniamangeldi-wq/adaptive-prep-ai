
-- 1) Tighten school_members INSERT: only allow self-join as student
DROP POLICY IF EXISTS "Users can join schools" ON public.school_members;

CREATE POLICY "Users can self-join schools as student"
  ON public.school_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'student'::user_role);

-- Allow school admins to add members of any role to their school (for approval flows)
CREATE POLICY "School admins can add members"
  ON public.school_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

-- 2) Restrict tutor_invite_codes broad SELECT; add lookup RPC
DROP POLICY IF EXISTS "Authenticated users can lookup by invite code" ON public.tutor_invite_codes;

CREATE OR REPLACE FUNCTION public.lookup_tutor_by_invite_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tutor_user_id FROM public.tutor_invite_codes
  WHERE invite_code = upper(_code)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_tutor_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_tutor_by_invite_code(text) TO authenticated;

-- 3) Hide schools.invite_code from non-admin members via column-level grants + RPC
REVOKE SELECT (invite_code) ON public.schools FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_school_invite_code(_school_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT invite_code FROM public.schools
  WHERE id = _school_id
    AND public.is_school_admin(_school_id, auth.uid())
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_school_invite_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_school_invite_code(uuid) TO authenticated;

-- 4) Fix mutable search_path on email queue helper functions
CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;
