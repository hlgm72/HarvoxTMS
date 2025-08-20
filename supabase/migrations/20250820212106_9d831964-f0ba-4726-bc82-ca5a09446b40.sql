-- CRITICAL SECURITY FIX: Secure Companies Table Data Access (Part 1)
-- Drop existing functions and recreate with proper security

-- ===============================================
-- 1. DROP EXISTING FUNCTIONS TO RECREATE PROPERLY
-- ===============================================

DROP FUNCTION IF EXISTS user_is_superadmin();
DROP FUNCTION IF EXISTS user_is_company_owner(uuid);
DROP FUNCTION IF EXISTS can_access_company_sensitive_data(uuid);
DROP FUNCTION IF EXISTS can_access_driver_highly_sensitive_data(uuid);
DROP FUNCTION IF EXISTS can_access_owner_details(uuid);
DROP FUNCTION IF EXISTS can_access_customer_contacts(uuid);
DROP FUNCTION IF EXISTS is_user_superadmin_safe(uuid);

-- ===============================================
-- 2. CREATE SECURITY HELPER FUNCTIONS
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