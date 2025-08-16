-- COMPREHENSIVE POLICY CLEANUP AND CORRECT IMPLEMENTATION
-- Clean up all duplicate and incorrectly named policies, then create proper ones

-- ===== 1. CLEAN UP company_client_contacts =====
DROP POLICY IF EXISTS "company_client_contacts_secure_access" ON company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_authenticated_members_only" ON company_client_contacts;
DROP POLICY IF EXISTS "Company client contacts authenticated only" ON company_client_contacts;

CREATE POLICY "company_client_contacts_final"
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

-- ===== 2. CLEAN UP company_owner_details =====
DROP POLICY IF EXISTS "company_owner_details_restricted_access" ON company_owner_details;
DROP POLICY IF EXISTS "company_owner_details_authenticated_owners_only" ON company_owner_details;
DROP POLICY IF EXISTS "owner_details_owners_only" ON company_owner_details;

CREATE POLICY "company_owner_details_final"
ON company_owner_details
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    )
    OR
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
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    )
    OR
    EXISTS (
      SELECT 1
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role = 'superadmin'
    )
  )
);

-- ===== 3. CLEAN UP driver_profiles =====
DROP POLICY IF EXISTS "driver_profiles_role_based_access" ON driver_profiles;
DROP POLICY IF EXISTS "driver_profiles_authenticated_access_only" ON driver_profiles;
DROP POLICY IF EXISTS "Driver profiles company access corrected" ON driver_profiles;

CREATE POLICY "driver_profiles_final"
ON driver_profiles
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    user_id = (SELECT auth.uid())
    OR
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
    user_id = (SELECT auth.uid())
    OR
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

-- ===== 4. CLEAN UP password_reset_tokens =====
DROP POLICY IF EXISTS "password_reset_tokens_email_owner_only" ON password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_service_operations" ON password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_access_policy" ON password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_service_role_only" ON password_reset_tokens;
DROP POLICY IF EXISTS "Service role can access reset tokens" ON password_reset_tokens;

CREATE POLICY "password_reset_tokens_user_final"
ON password_reset_tokens
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND user_email = (SELECT auth.email())
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND user_email = (SELECT auth.email())
);

CREATE POLICY "password_reset_tokens_service_final"
ON password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ===== 5. CLEAN UP profiles =====
DROP POLICY IF EXISTS "profiles_secure_user_access" ON profiles;
DROP POLICY IF EXISTS "profiles_authenticated_user_access_only" ON profiles;
DROP POLICY IF EXISTS "profiles_optimized_select" ON profiles;
DROP POLICY IF EXISTS "profiles_comprehensive_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_comprehensive_update" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can delete their own profile" ON profiles;

CREATE POLICY "profiles_final"
ON profiles
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    user_id = (SELECT auth.uid())
    OR
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
    user_id = (SELECT auth.uid())
    OR
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