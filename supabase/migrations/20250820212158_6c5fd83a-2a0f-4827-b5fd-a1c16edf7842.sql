-- CRITICAL SECURITY FIX: Secure Companies Table Data Access (Complete Fix)
-- This addresses the vulnerability where company financial data could be stolen by hackers

-- ===============================================
-- 1. DROP EXISTING POLICIES AND FUNCTIONS
-- ===============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "companies_insert_superadmin_only" ON companies;
DROP POLICY IF EXISTS "companies_secure_delete_prohibited" ON companies; 
DROP POLICY IF EXISTS "companies_select_members_only" ON companies;
DROP POLICY IF EXISTS "companies_update_owners_and_admins" ON companies;

-- Now drop the functions
DROP FUNCTION IF EXISTS user_is_superadmin() CASCADE;
DROP FUNCTION IF EXISTS user_is_company_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_access_company_sensitive_data(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_access_driver_highly_sensitive_data(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_access_owner_details(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_access_customer_contacts(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_user_superadmin_safe(uuid) CASCADE;

-- ===============================================
-- 2. CREATE SECURITY HELPER FUNCTIONS
-- ===============================================

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

-- ===============================================
-- 3. CREATE ULTRA-RESTRICTIVE RLS POLICIES
-- ===============================================

-- SELECT: Only authenticated company members can see their own company data
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

-- INSERT: Only superadmins can create companies
CREATE POLICY "companies_ultra_secure_insert"
ON companies FOR INSERT
TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND user_is_superadmin()
);

-- UPDATE: Only superadmins or company owners can update
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

-- DELETE: Completely prohibited
CREATE POLICY "companies_ultra_secure_delete_prohibited"
ON companies FOR DELETE
TO authenticated
USING (false);

-- ===============================================
-- 4. CREATE SECURE RPC FUNCTIONS FOR DATA ACCESS
-- ===============================================

-- Function to get basic company info (safe data only)
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

  -- Log access for audit trail
  PERFORM log_company_data_access(c.id, 'basic_info', 'view')
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

  -- Return basic company data based on permissions
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

-- Function to get financial company data (highly restricted)
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

  -- Log access to sensitive financial data
  PERFORM log_company_data_access(c.id, 'financial_data', 'view')
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

  -- Return financial data only to authorized personnel
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