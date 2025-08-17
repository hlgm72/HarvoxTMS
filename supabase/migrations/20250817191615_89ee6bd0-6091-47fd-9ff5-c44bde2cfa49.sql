-- Security Fix: Restrict Driver Personal Information Access (Part 1 - Clean Dependencies)
-- Issue: Operations managers can access highly sensitive driver PII
-- Solution: Drop dependent policies first, then recreate with proper restrictions

-- 1. Drop all existing driver_profiles policies to remove dependencies
DROP POLICY IF EXISTS "driver_profiles_select_optimized" ON driver_profiles;
DROP POLICY IF EXISTS "driver_profiles_insert_optimized" ON driver_profiles; 
DROP POLICY IF EXISTS "driver_profiles_update_optimized" ON driver_profiles;
DROP POLICY IF EXISTS "driver_profiles_delete_optimized" ON driver_profiles;

-- 2. Drop existing functions now that dependencies are removed
DROP FUNCTION IF EXISTS public.can_access_driver_sensitive_data(uuid);
DROP FUNCTION IF EXISTS public.get_driver_basic_info(uuid);
DROP FUNCTION IF EXISTS public.get_driver_sensitive_info(uuid);

-- 3. Create more restrictive function for highly sensitive data access
CREATE OR REPLACE FUNCTION public.can_access_driver_highly_sensitive_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Driver can access their own data
    WHEN target_user_id = auth.uid() THEN true
    -- ONLY company_owner and superadmin can access highly sensitive PII
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = target_user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'superadmin')
    ) THEN true
    ELSE false
  END;
$$;

-- 4. Create function for basic operational data (less sensitive)
CREATE OR REPLACE FUNCTION public.can_access_driver_operational_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Driver can access their own data
    WHEN target_user_id = auth.uid() THEN true
    -- Operations managers can access basic operational data only
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = target_user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    ) THEN true
    ELSE false
  END;
$$;

-- 5. Recreate the driver_profiles policies with new security model
CREATE POLICY "driver_profiles_select_ultra_restricted" ON driver_profiles
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can access their own data
    user_id = (SELECT auth.uid())
    OR
    -- Only company owners and superadmins can access full profiles with sensitive data
    can_access_driver_highly_sensitive_data(user_id)
  )
);

CREATE POLICY "driver_profiles_insert_owners_only" ON driver_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can create their own profile
    user_id = (SELECT auth.uid())
    OR
    -- Only company owners and superadmins can create profiles
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

CREATE POLICY "driver_profiles_update_owners_only" ON driver_profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can update their own data
    user_id = (SELECT auth.uid())
    OR
    -- Only company owners and superadmins can update profiles
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
    -- Only company owners and superadmins can update profiles
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

CREATE POLICY "driver_profiles_delete_superadmin_only" ON driver_profiles
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