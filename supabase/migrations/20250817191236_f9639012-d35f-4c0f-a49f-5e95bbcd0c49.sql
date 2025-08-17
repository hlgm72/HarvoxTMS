-- Fix RLS performance warnings by optimizing auth function calls
-- Wrap auth.<function>() calls with (select auth.<function>()) to prevent re-evaluation per row

-- Fix loads_unified_access policy
DROP POLICY IF EXISTS "loads_unified_access" ON loads;

CREATE POLICY "loads_unified_access" ON loads
FOR ALL
USING (
  -- User must be authenticated and not anonymous
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- User is the driver assigned to the load
    driver_user_id = (SELECT auth.uid()) OR
    -- User created the load (for unassigned loads)
    (driver_user_id IS NULL AND created_by = (SELECT auth.uid())) OR
    -- User has access through company membership
    (
      payment_period_id IN (
        SELECT cpp.id
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  -- User must be authenticated and not anonymous
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- For new loads, user must have admin privileges in the company
    payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    ) AND
    -- Period must not be locked
    NOT EXISTS (
      SELECT 1 FROM company_payment_periods cpp
      WHERE cpp.id = payment_period_id AND cpp.is_locked = true
    )
  )
);

-- Fix companies_select_members_only policy
DROP POLICY IF EXISTS "companies_select_members_only" ON companies;

CREATE POLICY "companies_select_members_only" ON companies
FOR SELECT
USING (
  -- User must be authenticated and not anonymous
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) AND
  (
    -- Superadmins can see all companies
    user_is_superadmin() OR
    -- Company members can see their own company
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
  )
);

-- Fix companies_insert_superadmin_only policy
DROP POLICY IF EXISTS "companies_insert_superadmin_only" ON companies;

CREATE POLICY "companies_insert_superadmin_only" ON companies
FOR INSERT
WITH CHECK (
  -- Only superadmins can create new companies
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) AND
  user_is_superadmin()
);

-- Fix companies_update_owners_and_admins policy
DROP POLICY IF EXISTS "companies_update_owners_and_admins" ON companies;

CREATE POLICY "companies_update_owners_and_admins" ON companies
FOR UPDATE
USING (
  -- User must be authenticated and not anonymous
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) AND
  (
    -- Superadmins can update all companies
    user_is_superadmin() OR
    -- Company owners can update their own company
    user_is_company_owner(id)
  )
)
WITH CHECK (
  -- Same conditions for the check constraint
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) AND
  (
    user_is_superadmin() OR
    user_is_company_owner(id)
  )
);