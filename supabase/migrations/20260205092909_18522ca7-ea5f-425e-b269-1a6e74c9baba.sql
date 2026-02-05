-- Drop and recreate the broken policies on schools table
DROP POLICY IF EXISTS "School members can view their school" ON public.schools;
DROP POLICY IF EXISTS "School admins can update their school" ON public.schools;
DROP POLICY IF EXISTS "Authenticated users can create schools" ON public.schools;

-- Create proper INSERT policy - allow any authenticated user to create a school
CREATE POLICY "Authenticated users can create schools"
ON public.schools FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create proper SELECT policy using security definer function
CREATE POLICY "School members can view their school"
ON public.schools FOR SELECT
USING (public.is_school_member(id, auth.uid()));

-- Create proper UPDATE policy using security definer function  
CREATE POLICY "School admins can update their school"
ON public.schools FOR UPDATE
USING (public.is_school_admin(id, auth.uid()));