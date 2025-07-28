-- Eliminar todas las políticas existentes de other_income
DROP POLICY IF EXISTS "Drivers can view their own other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can view company drivers other income" ON public.other_income;
DROP POLICY IF EXISTS "Drivers can create their own other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can create other income for company drivers" ON public.other_income;
DROP POLICY IF EXISTS "Drivers can update their own pending other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can update company drivers other income" ON public.other_income;
DROP POLICY IF EXISTS "Drivers can delete their own pending other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can delete company drivers other income" ON public.other_income;

-- Crear políticas optimizadas (una por acción)

-- Política unificada para SELECT
CREATE POLICY "Other income select policy" 
ON public.other_income 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Los conductores pueden ver sus propios ingresos
    (SELECT auth.uid()) = driver_user_id
    OR
    -- Los gerentes pueden ver ingresos de conductores de su empresa
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr1
      JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = (SELECT auth.uid())
      AND ucr1.role IN ('company_owner', 'operations_manager', 'dispatcher')
      AND ucr1.is_active = true
      AND ucr2.user_id = driver_user_id
      AND ucr2.role = 'driver'
      AND ucr2.is_active = true
    )
  )
);

-- Política unificada para INSERT
CREATE POLICY "Other income insert policy" 
ON public.other_income 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Los conductores pueden crear sus propios ingresos
    (SELECT auth.uid()) = driver_user_id
    OR
    -- Los gerentes pueden crear ingresos para conductores de su empresa
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr1
      JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = (SELECT auth.uid())
      AND ucr1.role IN ('company_owner', 'operations_manager')
      AND ucr1.is_active = true
      AND ucr2.user_id = driver_user_id
      AND ucr2.role = 'driver'
      AND ucr2.is_active = true
    )
  )
);

-- Política unificada para UPDATE
CREATE POLICY "Other income update policy" 
ON public.other_income 
FOR UPDATE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Los conductores pueden actualizar sus propios ingresos pendientes
    ((SELECT auth.uid()) = driver_user_id AND status = 'pending')
    OR
    -- Los gerentes pueden actualizar ingresos de conductores de su empresa
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr1
      JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = (SELECT auth.uid())
      AND ucr1.role IN ('company_owner', 'operations_manager')
      AND ucr1.is_active = true
      AND ucr2.user_id = driver_user_id
      AND ucr2.role = 'driver'
      AND ucr2.is_active = true
    )
  )
);

-- Política unificada para DELETE
CREATE POLICY "Other income delete policy" 
ON public.other_income 
FOR DELETE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Los conductores pueden eliminar sus propios ingresos pendientes
    ((SELECT auth.uid()) = driver_user_id AND status = 'pending')
    OR
    -- Los gerentes pueden eliminar ingresos de conductores de su empresa
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr1
      JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = (SELECT auth.uid())
      AND ucr1.role IN ('company_owner', 'operations_manager')
      AND ucr1.is_active = true
      AND ucr2.user_id = driver_user_id
      AND ucr2.role = 'driver'
      AND ucr2.is_active = true
    )
  )
);