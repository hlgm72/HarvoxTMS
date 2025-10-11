-- =====================================================
-- FIX RLS PERFORMANCE ISSUES & DUPLICATE INDEX
-- =====================================================

-- =====================================================
-- 1. OTHER_INCOME TABLE
-- =====================================================
DROP POLICY IF EXISTS "other_income_select_company" ON public.other_income;
CREATE POLICY "other_income_select_company" ON public.other_income
FOR SELECT
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND (
    user_id = (select auth.uid())
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "other_income_insert_managers" ON public.other_income;
CREATE POLICY "other_income_insert_managers" ON public.other_income
FOR INSERT
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

DROP POLICY IF EXISTS "other_income_update_if_not_paid" ON public.other_income;
CREATE POLICY "other_income_update_if_not_paid" ON public.other_income
FOR UPDATE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

DROP POLICY IF EXISTS "other_income_delete_if_not_paid" ON public.other_income;
CREATE POLICY "other_income_delete_if_not_paid" ON public.other_income
FOR DELETE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

-- =====================================================
-- 2. BACKUP TABLES
-- =====================================================
DROP POLICY IF EXISTS "Backup tables superadmin only" ON public.driver_period_calculations_backup_20250211;
CREATE POLICY "Backup tables superadmin only" ON public.driver_period_calculations_backup_20250211
FOR ALL
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Backup tables superadmin only" ON public.company_payment_periods_backup_20250211;
CREATE POLICY "Backup tables superadmin only" ON public.company_payment_periods_backup_20250211
FOR ALL
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Backup tables superadmin only" ON public.loads_backup_20250211;
CREATE POLICY "Backup tables superadmin only" ON public.loads_backup_20250211
FOR ALL
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Migration FK backup superadmin only" ON public.migration_fk_backup;
CREATE POLICY "Migration FK backup superadmin only" ON public.migration_fk_backup
FOR ALL
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Migration audit log superadmin only" ON public.migration_audit_log;
CREATE POLICY "Migration audit log superadmin only" ON public.migration_audit_log
FOR ALL
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- =====================================================
-- 3. LOADS TABLE
-- =====================================================
DROP POLICY IF EXISTS "loads_select_company_access" ON public.loads;
CREATE POLICY "loads_select_company_access" ON public.loads
FOR SELECT
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND (
    driver_user_id = (select auth.uid())
    OR driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "loads_insert_company_managers" ON public.loads;
CREATE POLICY "loads_insert_company_managers" ON public.loads
FOR INSERT
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
  )
);

DROP POLICY IF EXISTS "loads_update_if_period_not_locked" ON public.loads;
CREATE POLICY "loads_update_if_period_not_locked" ON public.loads
FOR UPDATE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT is_payment_period_locked(payment_period_id)
  )
)
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

DROP POLICY IF EXISTS "loads_delete_if_period_not_locked" ON public.loads;
CREATE POLICY "loads_delete_if_period_not_locked" ON public.loads
FOR DELETE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT is_payment_period_locked(payment_period_id)
  )
);

-- =====================================================
-- 4. FUEL_EXPENSES TABLE
-- =====================================================
DROP POLICY IF EXISTS "fuel_expenses_select_company_access" ON public.fuel_expenses;
CREATE POLICY "fuel_expenses_select_company_access" ON public.fuel_expenses
FOR SELECT
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND (
    driver_user_id = (select auth.uid())
    OR driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "fuel_expenses_insert_company_managers" ON public.fuel_expenses;
CREATE POLICY "fuel_expenses_insert_company_managers" ON public.fuel_expenses
FOR INSERT
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

DROP POLICY IF EXISTS "fuel_expenses_update_if_not_paid" ON public.fuel_expenses;
CREATE POLICY "fuel_expenses_update_if_not_paid" ON public.fuel_expenses
FOR UPDATE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

DROP POLICY IF EXISTS "fuel_expenses_delete_if_not_paid" ON public.fuel_expenses;
CREATE POLICY "fuel_expenses_delete_if_not_paid" ON public.fuel_expenses
FOR DELETE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

-- =====================================================
-- 5. EXPENSE_INSTANCES TABLE
-- =====================================================
DROP POLICY IF EXISTS "expense_instances_select_company" ON public.expense_instances;
CREATE POLICY "expense_instances_select_company" ON public.expense_instances
FOR SELECT
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND (
    user_id = (select auth.uid())
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "expense_instances_insert_managers" ON public.expense_instances;
CREATE POLICY "expense_instances_insert_managers" ON public.expense_instances
FOR INSERT
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

DROP POLICY IF EXISTS "expense_instances_update_if_not_paid" ON public.expense_instances;
CREATE POLICY "expense_instances_update_if_not_paid" ON public.expense_instances
FOR UPDATE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

DROP POLICY IF EXISTS "expense_instances_delete_if_not_paid" ON public.expense_instances;
CREATE POLICY "expense_instances_delete_if_not_paid" ON public.expense_instances
FOR DELETE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

-- =====================================================
-- 6. FIX DUPLICATE CONSTRAINT
-- Eliminar constraint duplicada en user_payment_periods
-- =====================================================
ALTER TABLE public.user_payment_periods 
DROP CONSTRAINT IF EXISTS driver_period_calculations_company_payment_period_id_driver_key;