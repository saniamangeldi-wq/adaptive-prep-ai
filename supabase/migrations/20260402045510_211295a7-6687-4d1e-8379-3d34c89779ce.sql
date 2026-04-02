-- 1. Prevent users from changing their own role on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only allow role changes via service_role (server-side)
    IF current_setting('role') != 'service_role' THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change();

-- 2. Restrict user_roles: users can only self-assign 'student' role
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own student role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND role = 'student');

-- Restrict user_roles UPDATE to prevent self-escalation
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
CREATE POLICY "Users can update their own roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = 'student');

-- 3. Fix conversation-uploads storage bucket: make private
UPDATE storage.buckets SET public = false WHERE id = 'conversation-uploads';

-- Replace the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view conversation uploads" ON storage.objects;
CREATE POLICY "Users can view their own uploads"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'conversation-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Fix tutor_invite_codes: restrict public read
DROP POLICY IF EXISTS "Anyone can lookup codes for joining" ON public.tutor_invite_codes;
CREATE POLICY "Authenticated users can lookup by invite code"
ON public.tutor_invite_codes
FOR SELECT
TO authenticated
USING (true);