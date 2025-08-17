-- Fix performance issues with driver_profiles RLS policies
-- 1. Optimize auth function calls using SELECT syntax
-- 2. Consolidate multiple permissive policies for better performance

-- Drop existing policies
DROP POLICY IF EXISTS "driver_profiles_own_access" ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profiles_admin_access" ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profiles_admin_update_restricted" ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profiles_admin_insert_restricted" ON public.driver_profiles;

-- Create optimized consolidated policies using SELECT syntax for auth functions
-- Single policy for SELECT operations
CREATE POLICY "driver_profiles_select_optimized"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can access their own data
    user_id = (SELECT auth.uid())
    OR
    -- Company admins can access driver data within their company
    can_access_driver_sensitive_data(user_id)
  )
);

-- Single policy for INSERT operations
CREATE POLICY "driver_profiles_insert_optimized"
ON public.driver_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can create their own profile
    user_id = (SELECT auth.uid())
    OR
    -- Company admins can create profiles for drivers in their company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = driver_profiles.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'superadmin')
    )
  )
);

-- Single policy for UPDATE operations
CREATE POLICY "driver_profiles_update_optimized"
ON public.driver_profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can update their own data
    user_id = (SELECT auth.uid())
    OR
    -- Only company owners and superadmins can update driver profiles
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = driver_profiles.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'superadmin')
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can update their own data
    user_id = (SELECT auth.uid())
    OR
    -- Only company owners and superadmins can update driver profiles
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = driver_profiles.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'superadmin')
    )
  )
);

-- Single policy for DELETE operations (restrictive - only superadmins)
CREATE POLICY "driver_profiles_delete_optimized"
ON public.driver_profiles
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = driver_profiles.user_id
    AND ucr1.is_active = true
    AND ucr2.user_id = (SELECT auth.uid())
    AND ucr2.is_active = true
    AND ucr2.role = 'superadmin'
  )
);