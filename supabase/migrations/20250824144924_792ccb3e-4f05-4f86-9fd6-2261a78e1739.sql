-- Fix RLS policy performance issue by optimizing auth function calls
-- Drop the existing policy
DROP POLICY IF EXISTS "driver_profiles_select_own_and_company" ON driver_profiles;

-- Create optimized policy that evaluates auth functions once instead of per row
CREATE POLICY "driver_profiles_select_own_and_company" ON driver_profiles
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND (
      user_id = (SELECT auth.uid()) -- Users can view their own profile
      OR EXISTS (
        SELECT 1 FROM user_company_roles ucr1
        JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
        WHERE ucr1.user_id = driver_profiles.user_id
          AND ucr1.is_active = true
          AND ucr2.user_id = (SELECT auth.uid())
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
    )
  );