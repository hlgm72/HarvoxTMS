-- Fix anonymous access and secure additional tables
-- This corrects the remaining security issues

-- First, fix the policies to restrict to authenticated users only (not anonymous)
-- and secure the additional tables identified

-- 1. Fix company_client_contacts policy - restrict to authenticated users only
DROP POLICY IF EXISTS "company_client_contacts_secure_access" ON company_client_contacts;

CREATE POLICY "company_client_contacts_authenticated_members_only"
ON company_client_contacts
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND client_id IN (
    SELECT cc.id 
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND client_id IN (
    SELECT cc.id 
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);

-- 2. Fix driver_profiles policy - restrict to authenticated users only
DROP POLICY IF EXISTS "driver_profiles_role_based_access" ON driver_profiles;

CREATE POLICY "driver_profiles_authenticated_access_only"
ON driver_profiles
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
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
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
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
  )
);

-- 3. Fix company_owner_details policy - restrict to authenticated users only
DROP POLICY IF EXISTS "company_owner_details_restricted_access" ON company_owner_details;

CREATE POLICY "company_owner_details_authenticated_owners_only"
ON company_owner_details
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
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
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
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
  )
);

-- 4. Fix profiles policy - restrict to authenticated users only
DROP POLICY IF EXISTS "profiles_secure_user_access" ON profiles;

CREATE POLICY "profiles_authenticated_user_access_only"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
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
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
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
  )
);

-- 5. Secure owner_operators table 
ALTER TABLE owner_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_operators_authenticated_secure_access"
ON owner_operators
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- Owner-operators can see their own data
    user_id = (SELECT auth.uid())
    OR
    -- Company admins can see their company's owner-operators
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- Owner-operators can update their own data
    user_id = (SELECT auth.uid())
    OR
    -- Company admins can update their company's owner-operators
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);