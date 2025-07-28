-- Optimización de performance: Actualizar políticas RLS de fuel_expenses
-- Reemplazar auth.* con (SELECT auth.*) para mejor rendimiento

-- Eliminar las políticas existentes
DROP POLICY IF EXISTS "Company users can view fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company admins can insert fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company users can update fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company admins can delete fuel expenses" ON public.fuel_expenses;

-- Recrear con optimizaciones de performance
CREATE POLICY "Company users can view fuel expenses" ON public.fuel_expenses
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    driver_user_id = (SELECT auth.uid()) OR
    payment_period_id IN (
      SELECT cpp.id FROM public.company_payment_periods cpp
      JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Company admins can insert fuel expenses" ON public.fuel_expenses
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company users can update fuel expenses" ON public.fuel_expenses
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company admins can delete fuel expenses" ON public.fuel_expenses
FOR DELETE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);