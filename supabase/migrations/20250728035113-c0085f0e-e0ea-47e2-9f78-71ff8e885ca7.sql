-- Eliminar las políticas existentes para other_income
DROP POLICY IF EXISTS "Drivers can view their own other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can view company drivers other income" ON public.other_income;
DROP POLICY IF EXISTS "Drivers can create their own other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can create other income for company drivers" ON public.other_income;
DROP POLICY IF EXISTS "Drivers can update their own pending other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can update company drivers other income" ON public.other_income;
DROP POLICY IF EXISTS "Drivers can delete their own pending other income" ON public.other_income;
DROP POLICY IF EXISTS "Company managers can delete company drivers other income" ON public.other_income;

-- Crear políticas actualizadas que excluyan usuarios anónimos

-- Política para que los conductores puedan ver sus propios ingresos
CREATE POLICY "Drivers can view their own other income" 
ON public.other_income 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  auth.uid() = driver_user_id
);

-- Política para que gerentes y dueños de empresa puedan ver ingresos de conductores de su empresa
CREATE POLICY "Company managers can view company drivers other income" 
ON public.other_income 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr1
    JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = auth.uid()
    AND ucr1.role IN ('company_owner', 'operations_manager', 'dispatcher')
    AND ucr1.is_active = true
    AND ucr2.user_id = driver_user_id
    AND ucr2.role = 'driver'
    AND ucr2.is_active = true
  )
);

-- Política para que los conductores puedan crear sus propios ingresos
CREATE POLICY "Drivers can create their own other income" 
ON public.other_income 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  auth.uid() = driver_user_id
);

-- Política para que gerentes puedan crear ingresos para conductores de su empresa
CREATE POLICY "Company managers can create other income for company drivers" 
ON public.other_income 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr1
    JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = auth.uid()
    AND ucr1.role IN ('company_owner', 'operations_manager')
    AND ucr1.is_active = true
    AND ucr2.user_id = driver_user_id
    AND ucr2.role = 'driver'
    AND ucr2.is_active = true
  )
);

-- Política para que los conductores puedan actualizar sus propios ingresos (solo si están pendientes)
CREATE POLICY "Drivers can update their own pending other income" 
ON public.other_income 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  auth.uid() = driver_user_id AND 
  status = 'pending'
);

-- Política para que gerentes puedan actualizar ingresos de conductores de su empresa
CREATE POLICY "Company managers can update company drivers other income" 
ON public.other_income 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr1
    JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = auth.uid()
    AND ucr1.role IN ('company_owner', 'operations_manager')
    AND ucr1.is_active = true
    AND ucr2.user_id = driver_user_id
    AND ucr2.role = 'driver'
    AND ucr2.is_active = true
  )
);

-- Política para que los conductores puedan eliminar sus propios ingresos (solo si están pendientes)
CREATE POLICY "Drivers can delete their own pending other income" 
ON public.other_income 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  auth.uid() = driver_user_id AND 
  status = 'pending'
);

-- Política para que gerentes puedan eliminar ingresos de conductores de su empresa
CREATE POLICY "Company managers can delete company drivers other income" 
ON public.other_income 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr1
    JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = auth.uid()
    AND ucr1.role IN ('company_owner', 'operations_manager')
    AND ucr1.is_active = true
    AND ucr2.user_id = driver_user_id
    AND ucr2.role = 'driver'
    AND ucr2.is_active = true
  )
);