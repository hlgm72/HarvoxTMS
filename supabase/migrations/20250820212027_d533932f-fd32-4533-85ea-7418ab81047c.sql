-- CRITICAL SECURITY FIX: Secure Companies Table Data Access
-- This migration addresses the security vulnerability where company financial data
-- could be accessed by unauthorized users

-- ===============================================
-- 1. CREATE SECURITY HELPER FUNCTIONS
-- ===============================================

-- Function to check if user is a superadmin
CREATE OR REPLACE FUNCTION user_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- Function to check if user is company owner
CREATE OR REPLACE FUNCTION user_is_company_owner(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role = 'company_owner'
    AND is_active = true
  );
$$;

-- Function to check if user can access company sensitive data
CREATE OR REPLACE FUNCTION can_access_company_sensitive_data(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

-- Function to check if user can access driver sensitive data
CREATE OR REPLACE FUNCTION can_access_driver_highly_sensitive_data(driver_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User can access their own data
    auth.uid() = driver_user_id
    OR
    -- Or user is admin in same company as driver
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = driver_user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    );
$$;

-- Function to check if user can access owner details
CREATE OR REPLACE FUNCTION can_access_owner_details(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'superadmin')
    AND is_active = true
  );
$$;

-- Function to check if user can access customer contacts
CREATE OR REPLACE FUNCTION can_access_customer_contacts(client_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE cc.id = client_id_param
    AND ucr.user_id = auth.uid()
    AND ucr.is_active = true
  );
$$;

-- Function to safely check if user is superadmin (prevents recursion)
CREATE OR REPLACE FUNCTION is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = user_id_param
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- ===============================================
-- 2. DROP AND RECREATE COMPANIES TABLE RLS POLICIES
-- ===============================================

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "companies_insert_superadmin_only" ON companies;
DROP POLICY IF EXISTS "companies_secure_delete_prohibited" ON companies; 
DROP POLICY IF EXISTS "companies_select_members_only" ON companies;
DROP POLICY IF EXISTS "companies_update_owners_and_admins" ON companies;

-- Create ultra-restrictive SELECT policy
CREATE POLICY "companies_ultra_secure_select"
ON companies FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    -- Superadmins can see all companies
    user_is_superadmin()
    OR
    -- Users can only see companies they belong to
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  )
);

-- Create restrictive INSERT policy (superadmins only)
CREATE POLICY "companies_ultra_secure_insert"
ON companies FOR INSERT
TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND user_is_superadmin()
);

-- Create restrictive UPDATE policy
CREATE POLICY "companies_ultra_secure_update"
ON companies FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    user_is_superadmin()
    OR user_is_company_owner(id)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    user_is_superadmin()
    OR user_is_company_owner(id)
  )
);

-- Prohibit DELETE operations completely
CREATE POLICY "companies_ultra_secure_delete_prohibited"
ON companies FOR DELETE
TO authenticated
USING (false);

-- ===============================================
-- 3. CREATE SECURE RPC FUNCTIONS FOR DATA ACCESS
-- ===============================================

-- Secure function to get basic company info
CREATE OR REPLACE FUNCTION get_companies_basic_info()
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  city text,
  state_id char(2),
  zip_code varchar,
  phone text,
  email text,
  plan_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Log access for audit
  INSERT INTO company_data_access_log (company_id, accessed_by, access_type, action)
  SELECT 
    c.id,
    auth.uid(),
    'basic_info',
    'view'
  FROM companies c
  WHERE (
    user_is_superadmin()
    OR c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  );

  -- Return data based on permissions
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.city,
    c.state_id,
    c.zip_code,
    c.phone,
    c.email,
    c.plan_type,
    c.status,
    c.created_at,
    c.updated_at
  FROM companies c
  WHERE (
    user_is_superadmin()
    OR c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  );
END;
$$;

-- Secure function to get financial company data (restricted access)
CREATE OR REPLACE FUNCTION get_companies_financial_data()
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  city text,
  state_id char(2),
  zip_code varchar,
  phone text,
  email text,
  ein varchar,
  dot_number text,
  mc_number text,
  owner_name text,
  owner_email text,
  owner_phone text,
  owner_title text,
  plan_type text,
  status text,
  default_payment_frequency text,
  payment_cycle_start_day integer,
  payment_day text,
  default_leasing_percentage numeric,
  default_factoring_percentage numeric,
  default_dispatching_percentage numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Log access to sensitive data
  INSERT INTO company_data_access_log (company_id, accessed_by, access_type, action)
  SELECT 
    c.id,
    auth.uid(),
    'financial_data',
    'view'
  FROM companies c
  WHERE (
    user_is_superadmin()
    OR c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

  -- Return financial data only to authorized users
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.city,
    c.state_id,
    c.zip_code,
    c.phone,
    c.email,
    c.ein,
    c.dot_number,
    c.mc_number,
    c.owner_name,
    c.owner_email,
    c.owner_phone,
    c.owner_title,
    c.plan_type,
    c.status,
    c.default_payment_frequency,
    c.payment_cycle_start_day,
    c.payment_day,
    c.default_leasing_percentage,
    c.default_factoring_percentage,
    c.default_dispatching_percentage,
    c.created_at,
    c.updated_at
  FROM companies c
  WHERE (
    user_is_superadmin()
    OR c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );
END;
$$;