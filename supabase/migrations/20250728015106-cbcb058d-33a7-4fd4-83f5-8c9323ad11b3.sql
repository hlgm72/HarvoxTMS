-- Actualizar las políticas para incluir verificación de autenticación no anónima
DROP POLICY IF EXISTS "Company users can view driver fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Company admins can insert driver fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Company admins can update driver fuel cards" ON public.driver_fuel_cards;

-- Política corregida para ver tarjetas (solo usuarios autenticados no anónimos)
CREATE POLICY "Authenticated company users can view driver fuel cards" 
ON public.driver_fuel_cards 
FOR SELECT 
USING (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);

-- Política para insertar tarjetas (solo admins autenticados)
CREATE POLICY "Authenticated company admins can insert driver fuel cards" 
ON public.driver_fuel_cards 
FOR INSERT 
WITH CHECK (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- Política para actualizar tarjetas (solo admins autenticados)
CREATE POLICY "Authenticated company admins can update driver fuel cards" 
ON public.driver_fuel_cards 
FOR UPDATE 
USING (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);