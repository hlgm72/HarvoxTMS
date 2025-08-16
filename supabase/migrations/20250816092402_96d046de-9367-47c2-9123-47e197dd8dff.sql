-- FIX RLS PERFORMANCE WARNINGS - PART 2

-- ================================
-- 1. OPTIMIZE REMAINING POLICIES WITH AUTH FUNCTION WRAPPING
-- ================================

-- Fix expense_types policies
DROP POLICY IF EXISTS "expense_types_delete_secure" ON expense_types;
DROP POLICY IF EXISTS "expense_types_update_secure" ON expense_types;
DROP POLICY IF EXISTS "expense_types_insert" ON expense_types;

CREATE POLICY "expense_types_optimized_delete"
  ON expense_types FOR DELETE
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    )
  );

CREATE POLICY "expense_types_optimized_update"
  ON expense_types FOR UPDATE
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    )
  );

CREATE POLICY "expense_types_optimized_insert"
  ON expense_types FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    )
  );

-- Fix loads policies
DROP POLICY IF EXISTS "loads_secure_select" ON loads;
DROP POLICY IF EXISTS "loads_secure_insert" ON loads;
DROP POLICY IF EXISTS "loads_secure_update" ON loads;

CREATE POLICY "loads_optimized_select"
  ON loads FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (
      driver_user_id = (SELECT auth.uid()) OR
      payment_period_id IN (
        SELECT dpc.id
        FROM driver_period_calculations dpc
        JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = (SELECT auth.uid())
        AND ucr.is_active = true
      )
    )
  );

CREATE POLICY "loads_optimized_insert"
  ON loads FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (
      payment_period_id IN (
        SELECT dpc.id
        FROM driver_period_calculations dpc
        JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = (SELECT auth.uid())
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      ) OR
      (payment_period_id IS NULL AND created_by = (SELECT auth.uid()))
    )
  );

CREATE POLICY "loads_optimized_update"
  ON loads FOR UPDATE
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (
      driver_user_id = (SELECT auth.uid()) OR
      payment_period_id IN (
        SELECT dpc.id
        FROM driver_period_calculations dpc
        JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = (SELECT auth.uid())
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );