-- Fix security linter warnings

-- 1. Fix function search_path mutable issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

-- 2. Create helper function to check authenticated users with proper search_path
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.role() = 'authenticated';
$$;

-- 3. Create helper function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = company_id_param
    AND ucr.is_active = true
  );
$$;

-- 4. Update companies policy to be more specific
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL 
TO authenticated
USING (
  (auth.uid() IS NOT NULL) AND (
    (EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )) OR (
      id IN (
        SELECT ucr.company_id
        FROM user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND (
    (EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )) OR (
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = companies.id
        AND ucr.role = 'company_owner'
        AND ucr.is_active = true
      )
    )
  )
);

-- 5. Update some key policies to be more explicit about authentication
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL 
TO authenticated
USING (
  (auth.uid() IS NOT NULL) AND
  (NOT is_superadmin(auth.uid())) AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
  ))
);

-- 6. Update password reset tokens policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can read unexpired tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role can access reset tokens" ON public.password_reset_tokens
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 7. Update geotab policies to require authentication
DROP POLICY IF EXISTS "Geotab drivers comprehensive access" ON public.geotab_drivers;
CREATE POLICY "Authenticated users can access geotab drivers" ON public.geotab_drivers
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (false); -- Only service role can insert/update

DROP POLICY IF EXISTS "Allow read access to vehicle assignments" ON public.geotab_vehicle_assignments;
CREATE POLICY "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow read access to vehicle positions" ON public.geotab_vehicle_positions;
CREATE POLICY "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow read access to vehicles" ON public.geotab_vehicles;
CREATE POLICY "Authenticated users can read vehicles" ON public.geotab_vehicles
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 8. Keep public data tables accessible but with explicit policies
-- These are reference data that should remain public
-- us_cities, us_counties, us_states, zip_codes - these are fine as they are public reference data