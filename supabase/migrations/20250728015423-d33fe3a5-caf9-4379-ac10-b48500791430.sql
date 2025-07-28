-- Eliminar TODAS las políticas existentes para driver_fuel_cards para evitar duplicados
DROP POLICY IF EXISTS "Company users can view driver fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Company admins can insert driver fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Company admins can update driver fuel cards" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Driver cards company access policy" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Driver cards company delete policy" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Driver cards company insert policy" ON public.driver_fuel_cards;
DROP POLICY IF EXISTS "Driver cards company update policy" ON public.driver_fuel_cards;

-- Crear políticas optimizadas con SELECT para auth functions
CREATE POLICY "Company users can view driver fuel cards" 
ON public.driver_fuel_cards 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  )
);

-- Política para insertar tarjetas optimizada
CREATE POLICY "Company admins can insert driver fuel cards" 
ON public.driver_fuel_cards 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- Política para actualizar tarjetas optimizada
CREATE POLICY "Company admins can update driver fuel cards" 
ON public.driver_fuel_cards 
FOR UPDATE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- Política para eliminar tarjetas
CREATE POLICY "Company admins can delete driver fuel cards" 
ON public.driver_fuel_cards 
FOR DELETE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);