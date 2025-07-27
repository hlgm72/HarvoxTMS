-- Continuar con States, State Cities y Catálogos - excluir usuarios anónimos

-- States - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to states" ON public.states;
CREATE POLICY "States comprehensive access" ON public.states
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- State Cities - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to state cities" ON public.state_cities;
CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- Fuel Card Providers - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- Maintenance Types - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to maintenance types" ON public.maintenance_types;
CREATE POLICY "Maintenance types read access" ON public.maintenance_types
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- Expense Types - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to expense types" ON public.expense_types;
DROP POLICY IF EXISTS "Authenticated users can modify expense types" ON public.expense_types;

CREATE POLICY "Expense types complete policy" ON public.expense_types
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);