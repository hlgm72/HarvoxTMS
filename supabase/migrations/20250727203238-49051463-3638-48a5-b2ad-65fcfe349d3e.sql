-- Solución definitiva: Cambiar todas las políticas para excluir explícitamente anon
-- En lugar de usar TO authenticated (que incluye anon), vamos a ser más específicos

-- Primero, vamos a cambiar algunas políticas clave para que no usen TO authenticated
-- sino que verifiquen explícitamente que NO sea anon

-- States - Cambiar de TO authenticated a verificación explícita
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
CREATE POLICY "States comprehensive access" ON public.states
FOR SELECT
USING (
  (SELECT auth.role()) != 'anon' AND 
  public.is_authenticated_company_user()
);

-- State Cities
DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;
CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR SELECT
USING (
  (SELECT auth.role()) != 'anon' AND 
  public.is_authenticated_company_user()
);

-- US States
DROP POLICY IF EXISTS "Company users can read US states" ON public.us_states;
CREATE POLICY "Company users can read US states" ON public.us_states
FOR SELECT
USING (
  (SELECT auth.role()) != 'anon' AND 
  public.is_authenticated_company_user()
);

-- US Counties  
DROP POLICY IF EXISTS "Company users can read US counties" ON public.us_counties;
CREATE POLICY "Company users can read US counties" ON public.us_counties
FOR SELECT
USING (
  (SELECT auth.role()) != 'anon' AND 
  public.is_authenticated_company_user()
);

-- US Cities
DROP POLICY IF EXISTS "Company users can read US cities" ON public.us_cities;
CREATE POLICY "Company users can read US cities" ON public.us_cities
FOR SELECT
USING (
  (SELECT auth.role()) != 'anon' AND 
  public.is_authenticated_company_user()
);

-- ZIP Codes
DROP POLICY IF EXISTS "Company users can read ZIP codes" ON public.zip_codes;
CREATE POLICY "Company users can read ZIP codes" ON public.zip_codes
FOR SELECT
USING (
  (SELECT auth.role()) != 'anon' AND 
  public.is_authenticated_company_user()
);

-- ZIP City Links
DROP POLICY IF EXISTS "Company users can read ZIP city links" ON public.zip_city_links;
CREATE POLICY "Company users can read ZIP city links" ON public.zip_city_links
FOR SELECT
USING (
  (SELECT auth.role()) != 'anon' AND 
  public.is_authenticated_company_user()
);