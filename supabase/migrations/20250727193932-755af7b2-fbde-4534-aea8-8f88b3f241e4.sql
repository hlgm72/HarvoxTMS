-- CRITICAL FIX: Remove problematic auth.users reference in RLS policy
-- The issue is that we cannot access auth.users from RLS policies for public tables

-- Drop the current problematic policy
DROP POLICY IF EXISTS "Simple user company roles access" ON public.user_company_roles;

-- Create a much simpler policy that doesn't reference auth.users at all
CREATE POLICY "User company roles basic access" ON public.user_company_roles
FOR ALL 
TO authenticated
USING (
  -- Super simple: users can only see their own roles
  -- We remove any superadmin logic that references auth.users
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  -- For INSERT/UPDATE, only allow users to manage their own data
  user_id = (SELECT auth.uid())
);