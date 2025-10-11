-- ===============================================
-- 🚨 RECREAR RLS POLICIES PARA EXPENSE_INSTANCES Y OTHER_INCOME  
-- ===============================================

-- EXPENSE_INSTANCES
DROP POLICY IF EXISTS "expense_instances_delete_company_only" ON expense_instances;
DROP POLICY IF EXISTS "expense_instances_insert_company_only" ON expense_instances;
DROP POLICY IF EXISTS "expense_instances_select_final" ON expense_instances;
DROP POLICY IF EXISTS "expense_instances_update_company_only" ON expense_instances;

CREATE POLICY "expense_instances_select_company"
ON expense_instances FOR SELECT
USING (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "expense_instances_insert_managers"
ON expense_instances FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "expense_instances_update_if_not_paid"
ON expense_instances FOR UPDATE
USING (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = expense_instances.payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

CREATE POLICY "expense_instances_delete_if_not_paid"
ON expense_instances FOR DELETE
USING (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = expense_instances.payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

-- OTHER_INCOME
DROP POLICY IF EXISTS "other_income_access_policy" ON other_income;

CREATE POLICY "other_income_select_company"
ON other_income FOR SELECT
USING (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_insert_managers"
ON other_income FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "other_income_update_if_not_paid"
ON other_income FOR UPDATE
USING (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = other_income.payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

CREATE POLICY "other_income_delete_if_not_paid"
ON other_income FOR DELETE
USING (
  auth.role() = 'authenticated' AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
  AND (
    payment_period_id IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp
      WHERE upp.id = other_income.payment_period_id
      AND upp.payment_status = 'paid'
    )
  )
);

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('rls_recreation', 'expense_instances_other_income_policies_recreated', 'completed'),
       ('phase_summary', 'phase_3_fk_migration_completed', 'completed');