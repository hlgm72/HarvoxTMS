-- Fix Auth RLS Initialization Plan warnings by optimizing auth.uid() calls
-- Replace auth.uid() with (SELECT auth.uid()) for better performance

-- Companies policy optimization
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) OR 
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) OR EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.company_id = companies.id 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
  )
);

-- Profiles policy optimization
DROP POLICY IF EXISTS "Profiles user access" ON public.profiles;
CREATE POLICY "Profiles user access" ON public.profiles
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

-- Geographic data tables optimization
DROP POLICY IF EXISTS "Company users can read US cities" ON public.us_cities;
DROP POLICY IF EXISTS "Company users can read US counties" ON public.us_counties;
DROP POLICY IF EXISTS "Company users can read US states" ON public.us_states;
DROP POLICY IF EXISTS "Company users can read ZIP codes" ON public.zip_codes;
DROP POLICY IF EXISTS "Company users can read ZIP city links" ON public.zip_city_links;

CREATE POLICY "Company users can read US cities" ON public.us_cities
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "Company users can read US counties" ON public.us_counties
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "Company users can read US states" ON public.us_states
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "Company users can read ZIP codes" ON public.zip_codes
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "Company users can read ZIP city links" ON public.zip_city_links
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- Geotab tables optimization
DROP POLICY IF EXISTS "Authenticated users can access geotab drivers" ON public.geotab_drivers;
DROP POLICY IF EXISTS "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments;
DROP POLICY IF EXISTS "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions;
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.geotab_vehicles;

CREATE POLICY "Authenticated users can access geotab drivers" ON public.geotab_drivers
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "Authenticated users can read vehicles" ON public.geotab_vehicles
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- States tables optimization
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;

CREATE POLICY "States comprehensive access" ON public.states
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- System stats optimization
DROP POLICY IF EXISTS "System stats comprehensive access" ON public.system_stats;
CREATE POLICY "System stats comprehensive access" ON public.system_stats
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role = 'superadmin' 
    AND is_active = true
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role = 'superadmin' 
    AND is_active = true
  )
);

-- Security audit log optimization
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Superadmins can view audit logs" ON public.security_audit_log
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role = 'superadmin' 
    AND is_active = true
  )
);

-- Fuel card providers optimization
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- User invitations optimization
DROP POLICY IF EXISTS "Users can view their invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON public.user_invitations;

CREATE POLICY "Users can view their invitations" ON public.user_invitations
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid())));

CREATE POLICY "Users can accept their invitations" ON public.user_invitations
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid())))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid())));

-- Maintenance types optimization
DROP POLICY IF EXISTS "Maintenance types read access" ON public.maintenance_types;
CREATE POLICY "Maintenance types read access" ON public.maintenance_types
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  )
);

-- User company roles optimization
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can delete their own roles" ON public.user_company_roles;

CREATE POLICY "Users can view their own roles" ON public.user_company_roles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own roles" ON public.user_company_roles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own roles" ON public.user_company_roles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own roles" ON public.user_company_roles
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));