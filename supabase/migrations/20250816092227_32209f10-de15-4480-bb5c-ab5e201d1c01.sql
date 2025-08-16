-- FIX RLS PERFORMANCE WARNINGS

-- ================================
-- 1. REMOVE DUPLICATE POLICIES (Multiple Permissive Policies)
-- ================================

-- Remove old optimized policies for loads and load_stops
DROP POLICY IF EXISTS "loads_optimized_select" ON loads;
DROP POLICY IF EXISTS "loads_optimized_insert" ON loads;
DROP POLICY IF EXISTS "loads_optimized_update" ON loads;
DROP POLICY IF EXISTS "load_stops_optimized_select" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_insert" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_update" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_delete" ON load_stops;

-- ================================
-- 2. OPTIMIZE COMPANIES POLICIES (Fix Auth RLS Initplan)
-- ================================

-- Drop and recreate companies policies with optimized auth calls
DROP POLICY IF EXISTS "Companies unified delete policy" ON companies;
DROP POLICY IF EXISTS "Companies unified insert policy" ON companies;
DROP POLICY IF EXISTS "Companies unified select policy" ON companies;
DROP POLICY IF EXISTS "Companies unified update policy" ON companies;

CREATE POLICY "companies_optimized_delete"
  ON companies FOR DELETE
  USING (
    (current_setting('app.service_operation', true) = 'allowed') OR
    (
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
      is_user_superadmin_safe((SELECT auth.uid()))
    )
  );

CREATE POLICY "companies_optimized_insert"
  ON companies FOR INSERT
  WITH CHECK (
    (current_setting('app.service_operation', true) = 'allowed') OR
    (
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
      is_user_superadmin_safe((SELECT auth.uid()))
    )
  );

CREATE POLICY "companies_optimized_select"
  ON companies FOR SELECT
  USING (
    (current_setting('app.service_operation', true) = 'allowed') OR
    (
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
      (
        id IN (
          SELECT ucr.company_id
          FROM user_company_roles ucr
          WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
        ) OR
        is_user_superadmin_safe((SELECT auth.uid()))
      )
    )
  );

CREATE POLICY "companies_optimized_update"
  ON companies FOR UPDATE
  USING (
    (current_setting('app.service_operation', true) = 'allowed') OR
    (
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
      user_is_admin_in_company((SELECT auth.uid()), id)
    )
  )
  WITH CHECK (
    (current_setting('app.service_operation', true) = 'allowed') OR
    (
      (SELECT auth.uid()) IS NOT NULL AND
      COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
      user_is_admin_in_company((SELECT auth.uid()), id)
    )
  );

-- ================================
-- 3. OPTIMIZE PROFILES POLICIES
-- ================================

-- Drop and recreate profiles policies with optimized auth calls
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_secure_company_admin_view" ON profiles;
DROP POLICY IF EXISTS "profiles_secure_user_update_own" ON profiles;

CREATE POLICY "profiles_optimized_insert"
  ON profiles FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (SELECT auth.uid()) = user_id
  );

CREATE POLICY "profiles_optimized_select"
  ON profiles FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (
      (SELECT auth.uid()) = user_id OR
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

CREATE POLICY "profiles_optimized_update"
  ON profiles FOR UPDATE
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (SELECT auth.uid()) = user_id
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (SELECT auth.uid()) = user_id
  );