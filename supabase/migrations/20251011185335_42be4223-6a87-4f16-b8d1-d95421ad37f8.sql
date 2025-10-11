-- ===============================================
-- 🚨 RECREAR RLS POLICIES PARA FUEL_EXPENSES
-- ===============================================

-- Eliminar policies antiguas si existen
DROP POLICY IF EXISTS "Company users can view fuel expenses" ON fuel_expenses;
DROP POLICY IF EXISTS "Company admins can insert fuel expenses" ON fuel_expenses;
DROP POLICY IF EXISTS "fuel_expenses_delete_protected_by_payment_status" ON fuel_expenses;
DROP POLICY IF EXISTS "fuel_expenses_update_protected_by_payment_status" ON fuel_expenses;

-- Policy SELECT: Los usuarios pueden ver fuel expenses de su empresa
CREATE POLICY "fuel_expenses_select_company_access"
ON fuel_expenses
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    driver_user_id = auth.uid()
    OR
    driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid()
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

-- Policy INSERT: Solo managers pueden insertar
CREATE POLICY "fuel_expenses_insert_company_managers"
ON fuel_expenses
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Policy UPDATE: Solo si el conductor no está pagado
CREATE POLICY "fuel_expenses_update_if_not_paid"
ON fuel_expenses
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = fuel_expenses.payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
);

-- Policy DELETE: Similar a UPDATE
CREATE POLICY "fuel_expenses_delete_if_not_paid"
ON fuel_expenses
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = fuel_expenses.payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('rls_recreation', 'fuel_expenses_policies_recreated', 'completed');