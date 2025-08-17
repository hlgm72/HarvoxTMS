-- ============================================
-- SECURITY FIX: DROP EXISTING FUNCTIONS AND RECREATE
-- Drop existing functions that have type conflicts
-- ============================================

-- Drop existing functions that might have type conflicts
DROP FUNCTION IF EXISTS get_companies_basic_info(uuid);
DROP FUNCTION IF EXISTS get_companies_financial_data(uuid);
DROP FUNCTION IF EXISTS get_driver_basic_info(uuid);
DROP FUNCTION IF EXISTS get_driver_sensitive_info(uuid);
DROP FUNCTION IF EXISTS get_company_owner_details(uuid);

-- Drop existing security functions that we'll recreate
DROP FUNCTION IF EXISTS can_access_company_financial_data(uuid);
DROP FUNCTION IF EXISTS can_access_driver_sensitive_data(uuid);
DROP FUNCTION IF EXISTS can_access_owner_details(uuid);
DROP FUNCTION IF EXISTS log_driver_data_access(uuid, text);
DROP FUNCTION IF EXISTS log_owner_data_access(uuid, text);

-- ============================================
-- SECURITY FIX: COMPANY FINANCIAL DATA PROTECTION
-- Create secure RPC functions for data access with proper access control
-- ============================================

-- 1. Create function to check if user can access company financial data
CREATE OR REPLACE FUNCTION can_access_company_financial_data(company_id_param uuid)
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
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    ) OR 
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    );
$$;

-- 2. Create function to get basic company info (safe for all company users)
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
  -- Verify user has access to company
  IF target_company_id IS NOT NULL AND NOT user_can_access_company(target_company_id) THEN
    RAISE EXCEPTION 'Access denied to company data';
  END IF;

  -- Log the access
  IF target_company_id IS NOT NULL THEN
    PERFORM log_company_data_access(target_company_id, 'basic_company_info', 'view');
  END IF;

  -- Return basic company data (non-sensitive fields only)
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.state_id,
    c.city,
    c.zip_code,
    c.phone,
    c.email,
    c.logo_url,
    c.plan_type,
    c.status,
    c.max_vehicles,
    c.max_users,
    c.created_at,
    c.updated_at
  FROM companies c
  WHERE (target_company_id IS NULL OR c.id = target_company_id)
  AND user_can_access_company(c.id);
END;
$$;

-- 3. Create function to get financial company data (restricted access)
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
  IF NOT can_access_company_financial_data(target_company_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to access financial data';
  END IF;

  -- Log the access
  PERFORM log_company_data_access(target_company_id, 'financial_company_data', 'view');

  -- Return full financial data
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.state_id,
    c.city,
    c.zip_code,
    c.phone,
    c.email,
    c.logo_url,
    c.plan_type,
    c.status,
    c.max_vehicles,
    c.max_users,
    c.ein,
    c.mc_number,
    c.dot_number,
    c.default_payment_frequency,
    c.payment_cycle_start_day,
    c.payment_day,
    c.default_factoring_percentage,
    c.default_dispatching_percentage,
    c.default_leasing_percentage,
    c.load_assignment_criteria,
    c.contract_start_date,
    c.created_at,
    c.updated_at
  FROM companies c
  WHERE c.id = target_company_id;
END;
$$;

-- ============================================
-- SECURITY FIX: DRIVER PERSONAL INFORMATION PROTECTION
-- ============================================

-- 4. Create function to check if user can access driver sensitive data
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
    ) OR
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    );
$$;

-- 5. Create function to log driver data access
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

-- ============================================
-- SECURITY FIX: COMPANY OWNER DETAILS PROTECTION
-- ============================================

-- 6. Create function to check if user can access owner details
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
    ) OR
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    );
$$;

-- 7. Create function to log owner data access
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

-- 8. Update company_owner_details RLS policy for enhanced security
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