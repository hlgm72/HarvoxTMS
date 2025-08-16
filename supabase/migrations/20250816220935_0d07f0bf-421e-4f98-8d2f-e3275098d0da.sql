-- COMPREHENSIVE SECURITY FIX: Enable RLS for all exposed tables (CORRECTED VERSION)
-- This addresses all 5 critical security findings based on actual table structures

-- 1. Secure company_client_contacts table (already has some RLS, but ensuring it's complete)
-- Verify RLS is enabled
ALTER TABLE company_client_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate with correct name
DROP POLICY IF EXISTS "company_client_contacts_company_members_only" ON company_client_contacts;
DROP POLICY IF EXISTS "Company client contacts authenticated only" ON company_client_contacts;

CREATE POLICY "company_client_contacts_secure_access"
ON company_client_contacts
FOR ALL
TO authenticated
USING (
  client_id IN (
    SELECT cc.id 
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  client_id IN (
    SELECT cc.id 
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);

-- 2. Secure driver_profiles table  
-- Verify RLS is enabled
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate with correct name
DROP POLICY IF EXISTS "driver_profiles_secure_access" ON driver_profiles;
DROP POLICY IF EXISTS "Driver profiles company access corrected" ON driver_profiles;

CREATE POLICY "driver_profiles_role_based_access"
ON driver_profiles
FOR ALL
TO authenticated
USING (
  -- Users can see their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can see profiles of their company drivers
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
)
WITH CHECK (
  -- Users can update their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can update profiles of their company drivers
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
);

-- 3. Secure company_owner_details table
-- Verify RLS is enabled
ALTER TABLE company_owner_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate with correct name
DROP POLICY IF EXISTS "company_owner_details_owners_and_superadmin_only" ON company_owner_details;
DROP POLICY IF EXISTS "owner_details_owners_only" ON company_owner_details;

CREATE POLICY "company_owner_details_restricted_access"
ON company_owner_details
FOR ALL
TO authenticated
USING (
  -- Company owners can see their own company details
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'company_owner'
  )
  OR
  -- Superadmins can see all company owner details
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'superadmin'
  )
)
WITH CHECK (
  -- Company owners can modify their own company details
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'company_owner'
  )
  OR
  -- Superadmins can modify all company owner details
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'superadmin'
  )
);

-- 4. Secure profiles table
-- Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies and recreate
DROP POLICY IF EXISTS "profiles_users_and_company_admins_access" ON profiles;

CREATE POLICY "profiles_secure_user_access"
ON profiles
FOR ALL
TO authenticated
USING (
  -- Users can see their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can see profiles of their company members
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
)
WITH CHECK (
  -- Users can update their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can update profiles of their company members
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
);

-- 5. Secure password_reset_tokens table (using correct column name: user_email)
-- Verify RLS is enabled
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies and recreate
DROP POLICY IF EXISTS "password_reset_tokens_owner_only" ON password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_service_role" ON password_reset_tokens;

CREATE POLICY "password_reset_tokens_email_owner_only"
ON password_reset_tokens
FOR ALL
TO authenticated
USING (
  -- Users can only see tokens for their own email
  user_email = (SELECT auth.email())
)
WITH CHECK (
  -- Users can only create/update tokens for their own email
  user_email = (SELECT auth.email())
);

-- Create service role policy for password reset tokens (for system operations)
CREATE POLICY "password_reset_tokens_service_operations"
ON password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);