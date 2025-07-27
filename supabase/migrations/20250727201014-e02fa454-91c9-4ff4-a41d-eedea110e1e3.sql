-- Revertir políticas públicas y excluir usuarios anónimos
-- Aplicar la condición (auth.jwt()->>'is_anonymous')::boolean IS FALSE

-- US Cities - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to US cities" ON public.us_cities;
CREATE POLICY "Company users can read US cities" ON public.us_cities
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

-- US Counties - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to US counties" ON public.us_counties;
CREATE POLICY "Company users can read US counties" ON public.us_counties
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

-- US States - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to US states" ON public.us_states;
CREATE POLICY "Company users can read US states" ON public.us_states
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

-- ZIP Codes - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to ZIP codes" ON public.zip_codes;
CREATE POLICY "Company users can read ZIP codes" ON public.zip_codes
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

-- ZIP City Links - Requerir autenticación y excluir anónimos
DROP POLICY IF EXISTS "Public access to ZIP city links" ON public.zip_city_links;
CREATE POLICY "Company users can read ZIP city links" ON public.zip_city_links
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