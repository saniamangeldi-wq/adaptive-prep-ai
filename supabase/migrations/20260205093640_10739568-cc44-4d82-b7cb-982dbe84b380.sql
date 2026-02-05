-- Fix SELECT policy to allow creators to view their school immediately after creation
DROP POLICY IF EXISTS "School members can view their school" ON public.schools;

CREATE POLICY "School members can view their school"
ON public.schools FOR SELECT
USING (
  public.is_school_member(id, auth.uid()) 
  OR auth.uid() = created_by
);