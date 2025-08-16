-- FIX RLS PERFORMANCE WARNINGS - PART 3

-- ================================
-- 1. OPTIMIZE LOAD_STOPS POLICIES
-- ================================

-- Fix load_stops policies
DROP POLICY IF EXISTS "load_stops_secure_select" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_insert" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_update" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_delete" ON load_stops;

CREATE POLICY "load_stops_optimized_select"
  ON load_stops FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        l.driver_user_id = (SELECT auth.uid()) OR
        (ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true)
      )
    )
  );

CREATE POLICY "load_stops_optimized_insert"
  ON load_stops FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );

CREATE POLICY "load_stops_optimized_update"
  ON load_stops FOR UPDATE
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        l.driver_user_id = (SELECT auth.uid()) OR
        (ucr.user_id = (SELECT auth.uid()) 
         AND ucr.is_active = true
         AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin'))
      )
    )
  );

CREATE POLICY "load_stops_optimized_delete"
  ON load_stops FOR DELETE
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );

-- ================================
-- 2. OPTIMIZE COMPANY_PAYMENT_PERIODS POLICIES
-- ================================

DROP POLICY IF EXISTS "company_payment_periods_company_access" ON company_payment_periods;

CREATE POLICY "company_payment_periods_optimized"
  ON company_payment_periods FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );