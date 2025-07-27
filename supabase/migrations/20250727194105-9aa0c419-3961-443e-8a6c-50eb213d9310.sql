-- Fix profiles table RLS policy to avoid auth.users and complex table references
-- The current policy is trying to access user_company_roles which was causing the 406 error

-- Drop the current problematic policy
DROP POLICY IF EXISTS "Profiles admin and user access" ON public.profiles;

-- Create a simple policy that only allows users to see their own profile
CREATE POLICY "Profiles simple access" ON public.profiles
FOR ALL 
TO authenticated
USING (
  -- Users can only see their own profile
  id = (SELECT auth.uid())
)
WITH CHECK (
  -- Users can only modify their own profile
  id = (SELECT auth.uid())
);