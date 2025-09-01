-- ============================================================================
-- 🔒 ACTUALIZACIÓN DE POLÍTICAS RLS - OTRAS TABLAS FINANCIERAS
-- Aplicar protección individual por conductor en todas las tablas relacionadas
-- ============================================================================

-- 2. TABLA EXPENSE_INSTANCES - Actualizar políticas UPDATE y DELETE
DROP POLICY IF EXISTS "expense_instances_update_immutable_after_payment" ON public.expense_instances;
DROP POLICY IF EXISTS "expense_instances_delete_immutable_after_payment" ON public.expense_instances;

-- Nueva política UPDATE para expense_instances
CREATE POLICY "expense_instances_update_protected_by_payment_status" 
ON public.expense_instances FOR UPDATE
USING (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND
    ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )) AND
  -- ⭐ NUEVA PROTECCIÓN: Verificar que el conductor no esté pagado
  NOT is_driver_paid_in_period(user_id, (
    SELECT cpp.id 
    FROM driver_period_calculations dpc 
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id 
    WHERE dpc.id = payment_period_id
  ))
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND
    ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )) AND
  NOT is_driver_paid_in_period(user_id, (
    SELECT cpp.id 
    FROM driver_period_calculations dpc 
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id 
    WHERE dpc.id = payment_period_id
  ))
);

-- Nueva política DELETE para expense_instances
CREATE POLICY "expense_instances_delete_protected_by_payment_status" 
ON public.expense_instances FOR DELETE
USING (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND
    ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )) AND
  -- ⭐ NUEVA PROTECCIÓN: Verificar que el conductor no esté pagado
  NOT is_driver_paid_in_period(user_id, (
    SELECT cpp.id 
    FROM driver_period_calculations dpc 
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id 
    WHERE dpc.id = payment_period_id
  ))
);