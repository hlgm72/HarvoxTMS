-- Crear políticas de RLS para la tabla other_income

-- Política para que los conductores puedan ver sus propios ingresos
CREATE POLICY "Drivers can view their own other income" 
ON public.other_income 
FOR SELECT 
USING (
  auth.uid() = driver_user_id
);

-- Política para que gerentes y dueños de empresa puedan ver ingresos de conductores de su empresa
CREATE POLICY "Company managers can view company drivers other income" 
ON public.other_income 
FOR SELECT 
USING (
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
  auth.uid() = driver_user_id
);

-- Política para que gerentes puedan crear ingresos para conductores de su empresa
CREATE POLICY "Company managers can create other income for company drivers" 
ON public.other_income 
FOR INSERT 
WITH CHECK (
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
  auth.uid() = driver_user_id AND status = 'pending'
);

-- Política para que gerentes puedan actualizar ingresos de conductores de su empresa
CREATE POLICY "Company managers can update company drivers other income" 
ON public.other_income 
FOR UPDATE 
USING (
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
  auth.uid() = driver_user_id AND status = 'pending'
);

-- Política para que gerentes puedan eliminar ingresos de conductores de su empresa
CREATE POLICY "Company managers can delete company drivers other income" 
ON public.other_income 
FOR DELETE 
USING (
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

-- Asegurar que RLS esté habilitado en la tabla
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;