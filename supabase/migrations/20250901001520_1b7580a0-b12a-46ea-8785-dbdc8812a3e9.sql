-- ===================================================================
-- PROTECCIÓN COMPLETA DE INTEGRIDAD FINANCIERA (CORREGIDA)
-- Bloquear modificaciones de fuel_expenses y other_income en períodos pagados
-- ===================================================================

-- ================================
-- 1. POLÍTICAS PARA FUEL_EXPENSES
-- ================================

-- Política UPDATE para fuel_expenses (BLOQUEAR si período está bloqueado)
DROP POLICY IF EXISTS "fuel_expenses_update_immutable_after_payment" ON public.fuel_expenses;
CREATE POLICY "fuel_expenses_update_immutable_after_payment" ON public.fuel_expenses
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
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
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- Política DELETE para fuel_expenses (BLOQUEAR si período está bloqueado)
DROP POLICY IF EXISTS "fuel_expenses_delete_immutable_after_payment" ON public.fuel_expenses;
CREATE POLICY "fuel_expenses_delete_immutable_after_payment" ON public.fuel_expenses
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- ================================
-- 2. POLÍTICAS PARA OTHER_INCOME
-- ================================

-- Política UPDATE para other_income (BLOQUEAR si período está bloqueado)
DROP POLICY IF EXISTS "other_income_update_immutable_after_payment" ON public.other_income;
CREATE POLICY "other_income_update_immutable_after_payment" ON public.other_income
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
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
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- Política DELETE para other_income (BLOQUEAR si período está bloqueado)
DROP POLICY IF EXISTS "other_income_delete_immutable_after_payment" ON public.other_income;
CREATE POLICY "other_income_delete_immutable_after_payment" ON public.other_income
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- ================================
-- 3. COMENTARIOS DOCUMENTACIÓN
-- ================================

COMMENT ON POLICY "fuel_expenses_update_immutable_after_payment" ON public.fuel_expenses IS 
'Bloquea modificaciones de gastos de combustible en períodos de pago bloqueados para mantener integridad financiera';

COMMENT ON POLICY "fuel_expenses_delete_immutable_after_payment" ON public.fuel_expenses IS 
'Bloquea eliminaciones de gastos de combustible en períodos de pago bloqueados para mantener integridad financiera';

COMMENT ON POLICY "other_income_update_immutable_after_payment" ON public.other_income IS 
'Bloquea modificaciones de otros ingresos en períodos de pago bloqueados para mantener integridad financiera';

COMMENT ON POLICY "other_income_delete_immutable_after_payment" ON public.other_income IS 
'Bloquea eliminaciones de otros ingresos en períodos de pago bloqueados para mantener integridad financiera';