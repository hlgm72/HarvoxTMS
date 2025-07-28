-- Recrear las políticas con verificación explícita de no-anónimo
DROP POLICY IF EXISTS "Authenticated company users can view driver fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Authenticated company admins can insert driver fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Authenticated company admins can update driver fuel cards" ON public.driver_fuel_cards;

-- Política para ver tarjetas con verificación explícita de no-anónimo
CREATE POLICY "Company users can view driver fuel cards" 
ON public.driver_fuel_cards 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);

-- Política para insertar tarjetas con verificación explícita
CREATE POLICY "Company admins can insert driver fuel cards" 
ON public.driver_fuel_cards 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- Política para actualizar tarjetas con verificación explícita
CREATE POLICY "Company admins can update driver fuel cards" 
ON public.driver_fuel_cards 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);