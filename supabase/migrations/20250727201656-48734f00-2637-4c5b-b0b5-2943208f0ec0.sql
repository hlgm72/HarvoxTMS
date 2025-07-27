-- Optimizar las políticas RLS restantes para resolver warnings de performance

-- US States - Optimizar performance
DROP POLICY IF EXISTS "Company users can read US states" ON public.us_states;
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

-- US Counties - Optimizar performance
DROP POLICY IF EXISTS "Company users can read US counties" ON public.us_counties;
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

-- US Cities - Optimizar performance
DROP POLICY IF EXISTS "Company users can read US cities" ON public.us_cities;
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

-- ZIP Codes - Optimizar performance
DROP POLICY IF EXISTS "Company users can read ZIP codes" ON public.zip_codes;
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

-- ZIP City Links - Optimizar performance
DROP POLICY IF EXISTS "Company users can read ZIP city links" ON public.zip_city_links;
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