-- ============================================================================
-- 🔒 ACTUALIZACIÓN DE POLÍTICAS RLS PARA PROTECCIÓN POR CONDUCTOR INDIVIDUAL
-- Aplicar protección cuando el período esté bloqueado O el conductor esté pagado
-- ============================================================================

-- 1. TABLA LOADS - Actualizar políticas UPDATE y DELETE
DROP POLICY IF EXISTS "loads_update_immutable_after_payment" ON public.loads;
DROP POLICY IF EXISTS "loads_delete_immutable_after_payment" ON public.loads;

-- Nueva política UPDATE para loads - protección individual por conductor
CREATE POLICY "loads_update_protected_by_payment_status" 
ON public.loads FOR UPDATE
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- Acceso básico (conductor propio, sin asignación y creado por el usuario, o admin de empresa)
    (driver_user_id = (SELECT auth.uid())) OR 
    ((driver_user_id IS NULL) AND (created_by = (SELECT auth.uid()))) OR
    (payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ))
  ) AND
  -- ⭐ NUEVA PROTECCIÓN: El período no debe estar bloqueado NI el conductor debe estar pagado
  (payment_period_id IS NULL OR NOT is_financial_data_protected(driver_user_id, payment_period_id))
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    (driver_user_id = (SELECT auth.uid())) OR 
    ((driver_user_id IS NULL) AND (created_by = (SELECT auth.uid()))) OR
    (payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ))
  ) AND
  (payment_period_id IS NULL OR NOT is_financial_data_protected(driver_user_id, payment_period_id))
);

-- Nueva política DELETE para loads - protección individual por conductor
CREATE POLICY "loads_delete_protected_by_payment_status" 
ON public.loads FOR DELETE
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    (driver_user_id = (SELECT auth.uid())) OR 
    ((driver_user_id IS NULL) AND (created_by = (SELECT auth.uid()))) OR
    (payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ))
  ) AND
  -- ⭐ NUEVA PROTECCIÓN: El período no debe estar bloqueado NI el conductor debe estar pagado
  (payment_period_id IS NULL OR NOT is_financial_data_protected(driver_user_id, payment_period_id))
);