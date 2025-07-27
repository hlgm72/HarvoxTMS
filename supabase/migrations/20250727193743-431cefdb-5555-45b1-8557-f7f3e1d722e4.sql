-- EMERGENCY FIX: user_company_roles infinite recursion
-- This is causing the app to break completely

-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "Optimized role management policy" ON public.user_company_roles;

-- Create a simple, non-recursive policy for user_company_roles
-- This policy CANNOT reference user_company_roles in its logic
CREATE POLICY "Simple user company roles access" ON public.user_company_roles
FOR ALL 
TO authenticated
USING (
  -- Only check if user is authenticated, no self-referencing
  (SELECT auth.role()) = 'authenticated' AND 
  (
    -- User can see their own roles
    user_id = (SELECT auth.uid()) OR
    -- SuperAdmin can see all (check via metadata, not table)
    EXISTS (
      SELECT 1 FROM auth.users au 
      WHERE au.id = (SELECT auth.uid()) 
      AND au.raw_user_meta_data->>'invited_as' = 'superadmin'
    )
  )
)
WITH CHECK (
  -- For INSERT/UPDATE, only allow users to manage their own data
  (SELECT auth.role()) = 'authenticated' AND 
  user_id = (SELECT auth.uid())
);