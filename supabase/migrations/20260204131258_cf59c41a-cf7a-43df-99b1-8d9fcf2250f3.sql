-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "School admins can manage school members" ON public.school_members;
DROP POLICY IF EXISTS "Users can view school members of their school" ON public.school_members;

-- Create a helper function to check if user is school admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_school_admin(school_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM school_members
    WHERE school_id = school_uuid
      AND user_id = user_uuid
      AND role = 'school_admin'
  );
$$;

-- Create a helper function to check if user is member of school (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_school_member(school_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM school_members
    WHERE school_id = school_uuid
      AND user_id = user_uuid
  );
$$;

-- Policy: Users can view members of schools they belong to
CREATE POLICY "Users can view school members of their school"
ON public.school_members
FOR SELECT
USING (public.is_school_member(school_id, auth.uid()));

-- Policy: Users can insert themselves into a school (for joining via invite code)
CREATE POLICY "Users can join schools"
ON public.school_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: School admins can update school members
CREATE POLICY "School admins can update members"
ON public.school_members
FOR UPDATE
USING (public.is_school_admin(school_id, auth.uid()));

-- Policy: School admins can delete school members
CREATE POLICY "School admins can delete members"
ON public.school_members
FOR DELETE
USING (public.is_school_admin(school_id, auth.uid()));