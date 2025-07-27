-- Drop all policies that depend on the security definer functions first
-- Then drop the functions, and recreate policies with explicit checks

-- Step 1: Drop all policies that use the functions
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
DROP POLICY IF EXISTS "User company roles basic access" ON public.user_company_roles;
DROP POLICY IF EXISTS "Profiles user access" ON public.profiles;
DROP POLICY IF EXISTS "Company users can read US cities" ON public.us_cities;
DROP POLICY IF EXISTS "Company users can read US counties" ON public.us_counties;
DROP POLICY IF EXISTS "Company users can read US states" ON public.us_states;
DROP POLICY IF EXISTS "Company users can read ZIP codes" ON public.zip_codes;
DROP POLICY IF EXISTS "Company users can read ZIP city links" ON public.zip_city_links;
DROP POLICY IF EXISTS "Authenticated users can access geotab drivers" ON public.geotab_drivers;
DROP POLICY IF EXISTS "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments;
DROP POLICY IF EXISTS "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions;
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.geotab_vehicles;
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;
DROP POLICY IF EXISTS "System stats comprehensive access" ON public.system_stats;
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Maintenance types read access" ON public.maintenance_types;

-- Step 2: Now drop the functions
DROP FUNCTION IF EXISTS public.is_authenticated_user();
DROP FUNCTION IF EXISTS public.is_company_user();
DROP FUNCTION IF EXISTS public.is_superadmin_user();

-- Step 3: Recreate policies with inline auth checks (no functions)
-- These policies explicitly check auth state without using functions

-- Companies policy
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) OR 
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) OR EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.company_id = companies.id 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
  )
);

-- User company roles policy
CREATE POLICY "User company roles basic access" ON public.user_company_roles
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) OR
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'operations_manager') 
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'operations_manager') 
      AND ucr.is_active = true
    ) OR EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    )
  )
);

-- Profiles policy
CREATE POLICY "Profiles user access" ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Geographic data tables policies
CREATE POLICY "Company users can read US cities" ON public.us_cities
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read US counties" ON public.us_counties
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read US states" ON public.us_states
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read ZIP codes" ON public.zip_codes
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company users can read ZIP city links" ON public.zip_city_links
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Geotab tables policies
CREATE POLICY "Authenticated users can access geotab drivers" ON public.geotab_drivers
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Authenticated users can read vehicles" ON public.geotab_vehicles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- States tables policies
CREATE POLICY "States comprehensive access" ON public.states
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- System stats policy (superadmin only)
CREATE POLICY "System stats comprehensive access" ON public.system_stats
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND is_active = true
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND is_active = true
  )
);

-- Security audit log policy
CREATE POLICY "Superadmins can view audit logs" ON public.security_audit_log
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND is_active = true
  )
);

-- Fuel card providers policy
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- User invitations policies
CREATE POLICY "Users can view their invitations" ON public.user_invitations
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can accept their invitations" ON public.user_invitations
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Maintenance types policy
CREATE POLICY "Maintenance types read access" ON public.maintenance_types
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);