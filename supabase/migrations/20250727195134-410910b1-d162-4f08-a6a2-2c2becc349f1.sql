-- Fix all Anonymous Access Policy warnings by using SECURITY DEFINER functions
-- This migration replaces all "TO authenticated" policies with more explicit authentication checks

-- First, create helper security definer functions to validate user access
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_company_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin' AND is_active = true
    ) THEN true
    ELSE false
  END;
$$;

-- Now update all policies to use these functions instead of "TO authenticated"
-- This will eliminate the "Anonymous Access Policies" warnings

-- 1. Geographic data tables
DROP POLICY IF EXISTS "Company users can read US cities" ON public.us_cities;
DROP POLICY IF EXISTS "Company users can read US counties" ON public.us_counties;
DROP POLICY IF EXISTS "Company users can read US states" ON public.us_states;
DROP POLICY IF EXISTS "Company users can read ZIP codes" ON public.zip_codes;
DROP POLICY IF EXISTS "Company users can read ZIP city links" ON public.zip_city_links;

CREATE POLICY "Company users can read US cities" ON public.us_cities
FOR SELECT
USING (is_company_user());

CREATE POLICY "Company users can read US counties" ON public.us_counties
FOR SELECT
USING (is_company_user());

CREATE POLICY "Company users can read US states" ON public.us_states
FOR SELECT
USING (is_company_user());

CREATE POLICY "Company users can read ZIP codes" ON public.zip_codes
FOR SELECT
USING (is_company_user());

CREATE POLICY "Company users can read ZIP city links" ON public.zip_city_links
FOR SELECT
USING (is_company_user());

-- 2. Update other major table policies
-- Companies table
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL
USING (
  is_authenticated_user() AND (
    is_superadmin_user() OR 
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  is_authenticated_user() AND (
    is_superadmin_user() OR EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.company_id = companies.id 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
  )
);

-- User company roles
DROP POLICY IF EXISTS "User company roles basic access" ON public.user_company_roles;
CREATE POLICY "User company roles basic access" ON public.user_company_roles
FOR ALL
USING (
  is_authenticated_user() AND (
    user_id = auth.uid() OR 
    is_superadmin_user() OR
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
  is_authenticated_user() AND (
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'operations_manager') 
      AND ucr.is_active = true
    ) OR is_superadmin_user()
  )
);

-- Profiles
DROP POLICY IF EXISTS "Profiles user access" ON public.profiles;
CREATE POLICY "Profiles user access" ON public.profiles
FOR ALL
USING (is_authenticated_user() AND user_id = auth.uid())
WITH CHECK (is_authenticated_user() AND user_id = auth.uid());

-- Geotab tables
DROP POLICY IF EXISTS "Authenticated users can access geotab drivers" ON public.geotab_drivers;
CREATE POLICY "Authenticated users can access geotab drivers" ON public.geotab_drivers
FOR SELECT
USING (is_company_user());

DROP POLICY IF EXISTS "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments;
CREATE POLICY "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments
FOR SELECT
USING (is_company_user());

DROP POLICY IF EXISTS "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions;
CREATE POLICY "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions
FOR SELECT
USING (is_company_user());

DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.geotab_vehicles;
CREATE POLICY "Authenticated users can read vehicles" ON public.geotab_vehicles
FOR SELECT
USING (is_company_user());

-- States and state cities
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
CREATE POLICY "States comprehensive access" ON public.states
FOR SELECT
USING (is_company_user());

DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;
CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR SELECT
USING (is_company_user());

-- System stats (superadmin only)
DROP POLICY IF EXISTS "System stats comprehensive access" ON public.system_stats;
CREATE POLICY "System stats comprehensive access" ON public.system_stats
FOR ALL
USING (is_superadmin_user())
WITH CHECK (is_superadmin_user());

-- Security audit log
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Superadmins can view audit logs" ON public.security_audit_log
FOR SELECT
USING (is_superadmin_user());

-- Fuel card providers
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT
USING (is_company_user());

-- User invitations
DROP POLICY IF EXISTS "Users can view their invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON public.user_invitations;

CREATE POLICY "Users can view their invitations" ON public.user_invitations
FOR SELECT
USING (is_authenticated_user() AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can accept their invitations" ON public.user_invitations
FOR UPDATE
USING (is_authenticated_user() AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (is_authenticated_user() AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Maintenance types
DROP POLICY IF EXISTS "Maintenance types read access" ON public.maintenance_types;
CREATE POLICY "Maintenance types read access" ON public.maintenance_types
FOR SELECT
USING (is_company_user());