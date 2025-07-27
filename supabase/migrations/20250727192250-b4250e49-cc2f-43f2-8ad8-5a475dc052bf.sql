-- Fix remaining RLS performance issues and consolidate multiple permissive policies

-- 1. Fix remaining auth.uid() optimization issues
-- Fix payment_reports policies
DROP POLICY IF EXISTS "Company owners can update payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Company owners can delete payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Company managers can create payment reports" ON public.payment_reports;

-- Create single comprehensive payment_reports policy
CREATE POLICY "Payment reports comprehensive policy" ON public.payment_reports
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
    )
  )
);

-- Fix owner_operators policy
DROP POLICY IF EXISTS "Owner operators complete policy" ON public.owner_operators;
CREATE POLICY "Owner operators complete policy" ON public.owner_operators
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (SELECT auth.uid()) = user_id
);

-- Fix payment_methods policy
DROP POLICY IF EXISTS "Payment methods comprehensive policy" ON public.payment_methods;
CREATE POLICY "Payment methods comprehensive policy" ON public.payment_methods
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Fix us_states policies - consolidate multiple permissive policies
DROP POLICY IF EXISTS "Anyone can read US states" ON public.us_states;
DROP POLICY IF EXISTS "Service role can modify US states" ON public.us_states;
CREATE POLICY "US states unified access policy" ON public.us_states
FOR ALL 
TO public
USING (true)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- Fix us_counties policies - consolidate multiple permissive policies
DROP POLICY IF EXISTS "Anyone can read US counties" ON public.us_counties;
DROP POLICY IF EXISTS "Service role can modify US counties" ON public.us_counties;
CREATE POLICY "US counties unified access policy" ON public.us_counties
FOR ALL 
TO public
USING (true)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- Fix us_cities policy (if it has similar issues)
DROP POLICY IF EXISTS "Anyone can read US cities" ON public.us_cities;
DROP POLICY IF EXISTS "Service role can modify US cities" ON public.us_cities;
CREATE POLICY "US cities unified access policy" ON public.us_cities
FOR ALL 
TO public
USING (true)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- Fix zip_codes policy (if it has similar issues)
DROP POLICY IF EXISTS "Anyone can read ZIP codes" ON public.zip_codes;
DROP POLICY IF EXISTS "Service role can modify ZIP codes" ON public.zip_codes;
CREATE POLICY "ZIP codes unified access policy" ON public.zip_codes
FOR ALL 
TO public
USING (true)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- Fix zip_city_links policy (if it has similar issues)
DROP POLICY IF EXISTS "Anyone can read ZIP city links" ON public.zip_city_links;
DROP POLICY IF EXISTS "Service role can modify ZIP city links" ON public.zip_city_links;
CREATE POLICY "ZIP city links unified access policy" ON public.zip_city_links
FOR ALL 
TO public
USING (true)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);