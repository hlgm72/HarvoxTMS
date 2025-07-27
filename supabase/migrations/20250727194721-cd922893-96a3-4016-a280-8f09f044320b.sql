-- Remove permissive RLS policies for geographic data tables
-- The linter considers USING (true) as too permissive even with authenticated role

-- 1. Drop all existing policies for geographic tables
DROP POLICY IF EXISTS "Authenticated users can read US cities" ON public.us_cities;
DROP POLICY IF EXISTS "Authenticated users can read US counties" ON public.us_counties;
DROP POLICY IF EXISTS "Authenticated users can read US states" ON public.us_states;
DROP POLICY IF EXISTS "Authenticated users can read ZIP codes" ON public.zip_codes;
DROP POLICY IF EXISTS "Authenticated users can read ZIP city links" ON public.zip_city_links;

-- 2. Create more restrictive policies that require user to be authenticated
-- and have active company roles (more business logic based)
CREATE POLICY "Company users can read US cities" ON public.us_cities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read US counties" ON public.us_counties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read US states" ON public.us_states
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read ZIP codes" ON public.zip_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read ZIP city links" ON public.zip_city_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);