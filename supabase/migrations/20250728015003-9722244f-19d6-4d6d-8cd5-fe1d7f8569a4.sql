-- Eliminar políticas existentes y recrear las correctas para driver_fuel_cards
DROP POLICY IF EXISTS "Users can view fuel cards of their company drivers" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Company admins can insert fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Company admins can update fuel cards" ON public.driver_fuel_cards;

-- Crear políticas corregidas que funcionen con las consultas actuales
CREATE POLICY "Company users can view driver fuel cards" 
ON public.driver_fuel_cards 
FOR SELECT 
USING (
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);

-- Política para insertar tarjetas (solo admins de la empresa)
CREATE POLICY "Company admins can insert driver fuel cards" 
ON public.driver_fuel_cards 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- Política para actualizar tarjetas (solo admins de la empresa)
CREATE POLICY "Company admins can update driver fuel cards" 
ON public.driver_fuel_cards 
FOR UPDATE 
USING (
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);