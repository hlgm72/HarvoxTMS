-- Optimizar políticas RLS para mejor performance
-- Envolver auth.* functions en SELECT para evitar re-evaluación por fila

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations update policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations insert policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations delete policy" ON public.driver_period_calculations;

-- Crear políticas optimizadas
CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
  FOR SELECT USING (
    (SELECT auth.role()) = 'authenticated' AND 
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    (
      -- El usuario es el conductor
      (SELECT auth.uid()) = driver_user_id OR
      -- O el usuario pertenece a la misma empresa que el período
      company_payment_period_id IN (
        SELECT cpp.id 
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
      )
    )
  );

CREATE POLICY "Driver period calculations update policy" ON public.driver_period_calculations
  FOR UPDATE USING (
    (SELECT auth.role()) = 'authenticated' AND 
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND 
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
    )
  );

CREATE POLICY "Driver period calculations insert policy" ON public.driver_period_calculations
  FOR INSERT WITH CHECK (
    (SELECT auth.role()) = 'service_role' OR
    (
      (SELECT auth.role()) = 'authenticated' AND 
      (SELECT auth.uid()) IS NOT NULL AND 
      COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
      company_payment_period_id IN (
        SELECT cpp.id 
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
    )
  );

CREATE POLICY "Driver period calculations delete policy" ON public.driver_period_calculations
  FOR DELETE USING (
    (SELECT auth.role()) = 'authenticated' AND 
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    )
  );