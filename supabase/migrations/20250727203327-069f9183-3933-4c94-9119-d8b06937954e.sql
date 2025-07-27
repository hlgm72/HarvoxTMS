-- Enfoque más directo: No usar TO authenticated en absoluto
-- Simplemente usar USING sin especificar roles, esto excluye automáticamente anon

-- States - Enfoque sin TO clause
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
CREATE POLICY "States comprehensive access" ON public.states
FOR SELECT
USING (public.is_authenticated_company_user());

-- State Cities  
DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;
CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR SELECT
USING (public.is_authenticated_company_user());

-- Fuel Card Providers
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT
USING (public.is_authenticated_company_user());

-- Maintenance Types
DROP POLICY IF EXISTS "Maintenance types read access" ON public.maintenance_types;
CREATE POLICY "Maintenance types read access" ON public.maintenance_types
FOR SELECT
USING (public.is_authenticated_company_user());

-- Expense Types
DROP POLICY IF EXISTS "Expense types complete policy" ON public.expense_types;
CREATE POLICY "Expense types complete policy" ON public.expense_types
FOR ALL
USING (public.is_authenticated_company_user())
WITH CHECK (public.is_authenticated_company_user());

-- US States
DROP POLICY IF EXISTS "Company users can read US states" ON public.us_states;
CREATE POLICY "Company users can read US states" ON public.us_states
FOR SELECT
USING (public.is_authenticated_company_user());

-- US Counties
DROP POLICY IF EXISTS "Company users can read US counties" ON public.us_counties;
CREATE POLICY "Company users can read US counties" ON public.us_counties
FOR SELECT
USING (public.is_authenticated_company_user());

-- US Cities
DROP POLICY IF EXISTS "Company users can read US cities" ON public.us_cities;
CREATE POLICY "Company users can read US cities" ON public.us_cities
FOR SELECT
USING (public.is_authenticated_company_user());

-- ZIP Codes
DROP POLICY IF EXISTS "Company users can read ZIP codes" ON public.zip_codes;
CREATE POLICY "Company users can read ZIP codes" ON public.zip_codes
FOR SELECT
USING (public.is_authenticated_company_user());

-- ZIP City Links
DROP POLICY IF EXISTS "Company users can read ZIP city links" ON public.zip_city_links;
CREATE POLICY "Company users can read ZIP city links" ON public.zip_city_links
FOR SELECT
USING (public.is_authenticated_company_user());