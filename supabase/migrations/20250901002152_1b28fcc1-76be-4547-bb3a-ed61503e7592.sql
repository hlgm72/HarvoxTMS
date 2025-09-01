-- ===================================================================
-- CORRECCIÓN CRÍTICA DE SEGURIDAD FINANCIERA
-- Eliminar conflictos y proteger TODAS las tablas financieras
-- ===================================================================

-- ================================
-- 1. ELIMINAR POLÍTICAS CONFLICTIVAS
-- ================================

-- Limpiar fuel_expenses (tiene políticas duplicadas)
DROP POLICY IF EXISTS "Company users can update fuel expenses" ON public.fuel_expenses;

-- Limpiar other_income (tiene políticas duplicadas)
DROP POLICY IF EXISTS "other_income_optimized_update" ON public.other_income;
DROP POLICY IF EXISTS "other_income_unified_delete" ON public.other_income;

-- ================================
-- 2. PROTECCIÓN CRÍTICA: driver_period_calculations
-- ================================

-- Esta tabla contiene los valores finales de pago y es LA MÁS CRÍTICA
DROP POLICY IF EXISTS "driver_period_calculations_update_immutable_after_payment" ON public.driver_period_calculations;
CREATE POLICY "driver_period_calculations_update_immutable_after_payment" ON public.driver_period_calculations
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- BLOQUEAR DELETE de driver_period_calculations en períodos bloqueados
DROP POLICY IF EXISTS "driver_period_calculations_delete_immutable_after_payment" ON public.driver_period_calculations;
CREATE POLICY "driver_period_calculations_delete_immutable_after_payment" ON public.driver_period_calculations
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- ================================
-- 3. PROTECCIÓN: loads_archive
-- ================================

DROP POLICY IF EXISTS "loads_archive_update_immutable_after_payment" ON public.loads_archive;
CREATE POLICY "loads_archive_update_immutable_after_payment" ON public.loads_archive
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

DROP POLICY IF EXISTS "loads_archive_delete_immutable_after_payment" ON public.loads_archive;
CREATE POLICY "loads_archive_delete_immutable_after_payment" ON public.loads_archive
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- ================================
-- 4. PROTECCIÓN: payment_reports
-- ================================

DROP POLICY IF EXISTS "payment_reports_update_immutable_after_payment" ON public.payment_reports;
CREATE POLICY "payment_reports_update_immutable_after_payment" ON public.payment_reports
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

DROP POLICY IF EXISTS "payment_reports_delete_immutable_after_payment" ON public.payment_reports;
CREATE POLICY "payment_reports_delete_immutable_after_payment" ON public.payment_reports
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- ================================
-- 5. PROTECCIÓN: pending_expenses
-- ================================

DROP POLICY IF EXISTS "pending_expenses_update_immutable_after_payment" ON public.pending_expenses;
CREATE POLICY "pending_expenses_update_immutable_after_payment" ON public.pending_expenses
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (original_period_id IS NULL OR NOT is_payment_period_locked(original_period_id)) AND
  (applied_to_period_id IS NULL OR NOT is_payment_period_locked(applied_to_period_id))
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (original_period_id IS NULL OR NOT is_payment_period_locked(original_period_id)) AND
  (applied_to_period_id IS NULL OR NOT is_payment_period_locked(applied_to_period_id))
);

DROP POLICY IF EXISTS "pending_expenses_delete_immutable_after_payment" ON public.pending_expenses;
CREATE POLICY "pending_expenses_delete_immutable_after_payment" ON public.pending_expenses
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (original_period_id IS NULL OR NOT is_payment_period_locked(original_period_id)) AND
  (applied_to_period_id IS NULL OR NOT is_payment_period_locked(applied_to_period_id))
);

-- ================================
-- 6. PROTECCIÓN: recurring_expense_exclusions
-- ================================

DROP POLICY IF EXISTS "recurring_expense_exclusions_update_immutable_after_payment" ON public.recurring_expense_exclusions;
CREATE POLICY "recurring_expense_exclusions_update_immutable_after_payment" ON public.recurring_expense_exclusions
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

DROP POLICY IF EXISTS "recurring_expense_exclusions_delete_immutable_after_payment" ON public.recurring_expense_exclusions;
CREATE POLICY "recurring_expense_exclusions_delete_immutable_after_payment" ON public.recurring_expense_exclusions
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- ================================
-- 7. COMENTARIOS DE SEGURIDAD
-- ================================

COMMENT ON POLICY "driver_period_calculations_update_immutable_after_payment" ON public.driver_period_calculations IS 
'CRÍTICO: Bloquea modificaciones de cálculos finales de pago en períodos bloqueados';

COMMENT ON POLICY "driver_period_calculations_delete_immutable_after_payment" ON public.driver_period_calculations IS 
'CRÍTICO: Bloquea eliminaciones de cálculos finales de pago en períodos bloqueados';

COMMENT ON POLICY "loads_archive_update_immutable_after_payment" ON public.loads_archive IS 
'Protege cargas archivadas en períodos de pago bloqueados';

COMMENT ON POLICY "payment_reports_update_immutable_after_payment" ON public.payment_reports IS 
'Protege reportes de pago en períodos bloqueados';

COMMENT ON POLICY "pending_expenses_update_immutable_after_payment" ON public.pending_expenses IS 
'Protege gastos pendientes relacionados con períodos bloqueados';

COMMENT ON POLICY "recurring_expense_exclusions_update_immutable_after_payment" ON public.recurring_expense_exclusions IS 
'Protege exclusiones de gastos recurrentes en períodos bloqueados';