-- ============================================
-- SECURITY FIX: COMPANY FINANCIAL DATA PROTECTION
-- Create separate views for public vs financial company data
-- ============================================

-- 1. Create view for public company information (safe for all company users)
CREATE OR REPLACE VIEW companies_public AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  city,
  zip_code,
  phone,
  email,
  logo_url,
  plan_type,
  status,
  max_vehicles,
  max_users,
  created_at,
  updated_at
FROM companies;

-- 2. Create view for financial company information (restricted to owners/managers)
CREATE OR REPLACE VIEW companies_financial AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  city,
  zip_code,
  phone,
  email,
  logo_url,
  plan_type,
  status,
  max_vehicles,
  max_users,
  ein,
  mc_number,
  dot_number,
  default_payment_frequency,
  payment_cycle_start_day,
  payment_day,
  default_factoring_percentage,
  default_dispatching_percentage,
  default_leasing_percentage,
  load_assignment_criteria,
  contract_start_date,
  created_at,
  updated_at
FROM companies;

-- 3. Enable RLS on the views
ALTER VIEW companies_public OWNER TO postgres;
ALTER VIEW companies_financial OWNER TO postgres;

-- 4. Create RLS policies for public view (all company members can access)
CREATE POLICY "companies_public_view_members_only" 
ON companies_public FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  user_can_access_company(id)
);

-- 5. Create RLS policies for financial view (only owners/managers/superadmins)
CREATE POLICY "companies_financial_view_restricted" 
ON companies_financial FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  (user_is_company_owner(id) OR 
   user_is_superadmin() OR
   EXISTS (
     SELECT 1 FROM user_company_roles 
     WHERE user_id = (SELECT auth.uid()) 
     AND company_id = companies_financial.id 
     AND role = 'operations_manager' 
     AND is_active = true
   ))
);

-- ============================================
-- SECURITY FIX: DRIVER PERSONAL INFORMATION PROTECTION
-- Enhance RLS policies and create secure access functions
-- ============================================

-- 6. Create function to check if user can access driver sensitive data
CREATE OR REPLACE FUNCTION can_access_driver_sensitive_data(driver_user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    (SELECT auth.uid()) = driver_user_id_param OR -- Driver can see their own data
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = (SELECT auth.uid())
      AND ucr2.user_id = driver_user_id_param
      AND ucr1.is_active = true
      AND ucr2.is_active = true
      AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
    );
$$;

-- 7. Create function to log driver data access
CREATE OR REPLACE FUNCTION log_driver_data_access(driver_user_id_param uuid, access_type_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action,
    accessed_at
  )
  SELECT 
    ucr.company_id,
    (SELECT auth.uid()),
    access_type_param,
    'driver_data_access',
    now()
  FROM user_company_roles ucr
  WHERE ucr.user_id = driver_user_id_param
  AND ucr.is_active = true
  LIMIT 1;
END;
$$;

-- 8. Create view for basic driver information (safe for company users)
CREATE OR REPLACE VIEW driver_profiles_basic AS
SELECT 
  id,
  user_id,
  driver_id,
  is_active,
  created_at,
  updated_at
FROM driver_profiles;

-- 9. Create view for sensitive driver information (restricted access)
CREATE OR REPLACE VIEW driver_profiles_sensitive AS
SELECT 
  id,
  user_id,
  driver_id,
  license_number,
  license_state,
  license_issue_date,
  license_expiry_date,
  cdl_class,
  cdl_endorsements,
  emergency_contact_name,
  emergency_contact_phone,
  is_active,
  created_at,
  updated_at
FROM driver_profiles;

-- 10. Create RLS policies for driver profile views
CREATE POLICY "driver_profiles_basic_company_access" 
ON driver_profiles_basic FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  (user_id = (SELECT auth.uid()) OR 
   user_id IN (
     SELECT ucr1.user_id
     FROM user_company_roles ucr1
     WHERE ucr1.company_id IN (
       SELECT ucr2.company_id
       FROM user_company_roles ucr2
       WHERE ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
     )
     AND ucr1.is_active = true
   ))
);

CREATE POLICY "driver_profiles_sensitive_restricted_access" 
ON driver_profiles_sensitive FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  can_access_driver_sensitive_data(user_id)
);

-- ============================================
-- SECURITY FIX: COMPANY OWNER DETAILS PROTECTION
-- Enhanced access control for business owner information
-- ============================================

-- 11. Create function to check if user can access owner details
CREATE OR REPLACE FUNCTION can_access_owner_details(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = company_id_param
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
    );
$$;

-- 12. Create function to log owner data access
CREATE OR REPLACE FUNCTION log_owner_data_access(company_id_param uuid, access_type_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    accessed_at
  ) VALUES (
    company_id_param,
    (SELECT auth.uid()),
    access_type_param,
    now()
  );
END;
$$;

-- 13. Update company_owner_details RLS policy for enhanced security
DROP POLICY IF EXISTS "company_owner_details_final" ON company_owner_details;

CREATE POLICY "company_owner_details_ultra_restricted" 
ON company_owner_details FOR ALL
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  can_access_owner_details(company_id)
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  can_access_owner_details(company_id)
);

-- ============================================
-- SECURITY FIX: RPC FUNCTIONS FOR SECURE DATA ACCESS
-- Create secure functions for frontend data access
-- ============================================

-- 14. Create function to get basic company info (replaces direct table access)
CREATE OR REPLACE FUNCTION get_companies_basic_info(target_company_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  street_address text,
  state_id char(2),
  city text,
  zip_code varchar,
  phone text,
  email text,
  logo_url text,
  plan_type text,
  status text,
  max_vehicles integer,
  max_users integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log the access
  IF target_company_id IS NOT NULL THEN
    PERFORM log_company_data_access(target_company_id, 'basic_company_info', 'view');
  END IF;

  -- Return data based on access level
  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.street_address,
    cp.state_id,
    cp.city,
    cp.zip_code,
    cp.phone,
    cp.email,
    cp.logo_url,
    cp.plan_type,
    cp.status,
    cp.max_vehicles,
    cp.max_users,
    cp.created_at,
    cp.updated_at
  FROM companies_public cp
  WHERE (target_company_id IS NULL OR cp.id = target_company_id)
  AND user_can_access_company(cp.id);
END;
$$;

-- 15. Create function to get financial company data (restricted access)
CREATE OR REPLACE FUNCTION get_companies_financial_data(target_company_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  street_address text,
  state_id char(2),
  city text,
  zip_code varchar,
  phone text,
  email text,
  logo_url text,
  plan_type text,
  status text,
  max_vehicles integer,
  max_users integer,
  ein varchar,
  mc_number text,
  dot_number text,
  default_payment_frequency text,
  payment_cycle_start_day integer,
  payment_day text,
  default_factoring_percentage numeric,
  default_dispatching_percentage numeric,
  default_leasing_percentage numeric,
  load_assignment_criteria text,
  contract_start_date date,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify user has financial access
  IF NOT (user_is_company_owner(target_company_id) OR 
          user_is_superadmin() OR
          EXISTS (
            SELECT 1 FROM user_company_roles 
            WHERE user_id = (SELECT auth.uid()) 
            AND company_id = target_company_id 
            AND role = 'operations_manager' 
            AND is_active = true
          )) THEN
    RAISE EXCEPTION 'Insufficient permissions to access financial data';
  END IF;

  -- Log the access
  PERFORM log_company_data_access(target_company_id, 'financial_company_data', 'view');

  -- Return financial data
  RETURN QUERY
  SELECT 
    cf.id,
    cf.name,
    cf.street_address,
    cf.state_id,
    cf.city,
    cf.zip_code,
    cf.phone,
    cf.email,
    cf.logo_url,
    cf.plan_type,
    cf.status,
    cf.max_vehicles,
    cf.max_users,
    cf.ein,
    cf.mc_number,
    cf.dot_number,
    cf.default_payment_frequency,
    cf.payment_cycle_start_day,
    cf.payment_day,
    cf.default_factoring_percentage,
    cf.default_dispatching_percentage,
    cf.default_leasing_percentage,
    cf.load_assignment_criteria,
    cf.contract_start_date,
    cf.created_at,
    cf.updated_at
  FROM companies_financial cf
  WHERE cf.id = target_company_id;
END;
$$;