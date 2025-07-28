-- Actualizar políticas RLS para driver_period_calculations
-- El problema es que require_authenticated_user() puede fallar en el contexto del cliente

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations update policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations insert policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations delete policy" ON public.driver_period_calculations;

-- Crear nuevas políticas más robustas
CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    (
      -- El usuario es el conductor
      auth.uid() = driver_user_id OR
      -- O el usuario pertenece a la misma empresa que el período
      company_payment_period_id IN (
        SELECT cpp.id 
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = auth.uid() 
        AND ucr.is_active = true
      )
    )
  );

CREATE POLICY "Driver period calculations update policy" ON public.driver_period_calculations
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true
    )
  );

CREATE POLICY "Driver period calculations insert policy" ON public.driver_period_calculations
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR
    (
      auth.role() = 'authenticated' AND 
      auth.uid() IS NOT NULL AND 
      COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
      company_payment_period_id IN (
        SELECT cpp.id 
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = auth.uid() 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
    )
  );

CREATE POLICY "Driver period calculations delete policy" ON public.driver_period_calculations
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    )
  );