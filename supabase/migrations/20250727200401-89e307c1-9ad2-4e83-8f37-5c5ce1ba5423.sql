-- Eliminar warnings de seguridad para tablas geográficas públicas
-- Estas tablas contienen información pública no sensible

-- US Cities - Permitir lectura pública
DROP POLICY IF EXISTS "Company users can read US cities" ON public.us_cities;
CREATE POLICY "Public access to US cities" ON public.us_cities
FOR SELECT
TO public
USING (true);

-- US Counties - Permitir lectura pública  
DROP POLICY IF EXISTS "Company users can read US counties" ON public.us_counties;
CREATE POLICY "Public access to US counties" ON public.us_counties
FOR SELECT
TO public
USING (true);

-- US States - Permitir lectura pública
DROP POLICY IF EXISTS "Company users can read US states" ON public.us_states;
CREATE POLICY "Public access to US states" ON public.us_states
FOR SELECT
TO public
USING (true);

-- ZIP Codes - Permitir lectura pública
DROP POLICY IF EXISTS "Company users can read ZIP codes" ON public.zip_codes;
CREATE POLICY "Public access to ZIP codes" ON public.zip_codes
FOR SELECT
TO public
USING (true);

-- ZIP City Links - Permitir lectura pública
DROP POLICY IF EXISTS "Company users can read ZIP city links" ON public.zip_city_links;
CREATE POLICY "Public access to ZIP city links" ON public.zip_city_links
FOR SELECT
TO public
USING (true);

-- States - Permitir lectura pública
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
CREATE POLICY "Public access to states" ON public.states
FOR SELECT
TO public
USING (true);

-- State Cities - Permitir lectura pública
DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;
CREATE POLICY "Public access to state cities" ON public.state_cities
FOR SELECT
TO public
USING (true);