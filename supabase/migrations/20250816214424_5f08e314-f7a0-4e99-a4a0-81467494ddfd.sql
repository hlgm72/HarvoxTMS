-- Fix the security issue by ensuring views properly enforce RLS
-- The issue is that views need explicit RLS policies or proper base table filtering

-- Drop the problematic views and recreate them as security definer functions instead
-- This will ensure proper access control

DROP VIEW IF EXISTS public.companies_basic_info CASCADE;
DROP VIEW IF EXISTS public.companies_secure CASCADE; 
DROP VIEW IF EXISTS public.companies_with_owner_info CASCADE;

-- Create secure RPC functions instead of views for better access control
CREATE OR REPLACE FUNCTION public.get_companies_basic_info(company_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  state_id char(2),
  zip_code varchar,
  city text,
  phone text,
  email text,
  logo_url text,
  plan_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = true THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has access to company data
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND (
      company_id_param IS NULL 
      OR ucr.company_id = company_id_param
      OR ucr.role = 'superadmin'
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access company data';
  END IF;

  -- Return basic company info based on user permissions
  RETURN QUERY
  SELECT 
    c.id, c.name, c.street_address, c.state_id, c.zip_code,
    c.city, c.phone, c.email, c.logo_url, c.plan_type,
    c.status, c.created_at, c.updated_at
  FROM companies c
  JOIN user_company_roles ucr ON c.id = ucr.company_id
  WHERE ucr.user_id = auth.uid()
  AND ucr.is_active = true
  AND (company_id_param IS NULL OR c.id = company_id_param)
  
  UNION ALL
  
  -- Superadmin can see all companies
  SELECT 
    c.id, c.name, c.street_address, c.state_id, c.zip_code,
    c.city, c.phone, c.email, c.logo_url, c.plan_type,
    c.status, c.created_at, c.updated_at
  FROM companies c
  WHERE EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
  AND (company_id_param IS NULL OR c.id = company_id_param)
  AND NOT EXISTS (
    -- Avoid duplicates from the first query
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = c.id
    AND ucr.is_active = true
    AND ucr.role != 'superadmin'
  );
END;
$$;

-- Create secure function for financial data (restricted to owners/managers)
CREATE OR REPLACE FUNCTION public.get_companies_financial_data(company_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  state_id char(2),
  zip_code varchar,
  city text,
  phone text,
  email text,
  ein varchar,
  dot_number text,
  mc_number text,
  plan_type text,
  max_vehicles int,
  max_users int,
  status text,
  contract_start_date date,
  default_payment_frequency text,
  payment_cycle_start_day int,
  payment_day text,
  default_leasing_percentage numeric,
  default_factoring_percentage numeric,
  default_dispatching_percentage numeric,
  load_assignment_criteria text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = true THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has financial data access
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND (
      company_id_param IS NULL 
      OR ucr.company_id = company_id_param
      OR ucr.role = 'superadmin'
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access financial data';
  END IF;

  -- Return financial company data based on user permissions
  RETURN QUERY
  SELECT 
    c.id, c.name, c.street_address, c.state_id, c.zip_code,
    c.city, c.phone, c.email, c.ein, c.dot_number, c.mc_number,
    c.plan_type, c.max_vehicles, c.max_users, c.status,
    c.contract_start_date, c.default_payment_frequency,
    c.payment_cycle_start_day, c.payment_day,
    c.default_leasing_percentage, c.default_factoring_percentage,
    c.default_dispatching_percentage, c.load_assignment_criteria,
    c.logo_url, c.created_at, c.updated_at
  FROM companies c
  WHERE EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND (
      (ucr.company_id = c.id AND company_id_param IS NULL)
      OR (c.id = company_id_param)
      OR ucr.role = 'superadmin'
    )
  );
END;
$$;

-- Create secure function for owner info (most restricted)
CREATE OR REPLACE FUNCTION public.get_company_with_owner_details(company_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  state_id char(2),
  zip_code varchar,
  city text,
  phone text,
  email text,
  ein varchar,
  dot_number text,
  mc_number text,
  plan_type text,
  max_vehicles int,
  max_users int,
  status text,
  contract_start_date date,
  default_payment_frequency text,
  payment_cycle_start_day int,
  payment_day text,
  default_leasing_percentage numeric,
  default_factoring_percentage numeric,
  default_dispatching_percentage numeric,
  load_assignment_criteria text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_name text,
  owner_email text,
  owner_phone text,
  owner_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = true THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has owner data access (only company owners and superadmins)
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'superadmin')
    AND (ucr.company_id = company_id_param OR ucr.role = 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access owner data';
  END IF;

  -- Log access to sensitive data
  INSERT INTO company_data_access_log (
    company_id, accessed_by, access_type, action, accessed_at
  ) VALUES (
    company_id_param, auth.uid(), 'owner_details_access', 'view', now()
  );

  -- Return company data with owner details
  RETURN QUERY
  SELECT 
    c.id, c.name, c.street_address, c.state_id, c.zip_code,
    c.city, c.phone, c.email, c.ein, c.dot_number, c.mc_number,
    c.plan_type, c.max_vehicles, c.max_users, c.status,
    c.contract_start_date, c.default_payment_frequency,
    c.payment_cycle_start_day, c.payment_day,
    c.default_leasing_percentage, c.default_factoring_percentage,
    c.default_dispatching_percentage, c.load_assignment_criteria,
    c.logo_url, c.created_at, c.updated_at,
    cod.owner_name, cod.owner_email, cod.owner_phone, cod.owner_title
  FROM companies c
  LEFT JOIN company_owner_details cod ON c.id = cod.company_id
  WHERE c.id = company_id_param;
END;
$$;

-- Add comments explaining the security approach
COMMENT ON FUNCTION public.get_companies_basic_info IS 'Secure access to basic company data with proper authentication and authorization checks';
COMMENT ON FUNCTION public.get_companies_financial_data IS 'Secure access to financial company data, restricted to owners/managers/superadmins';
COMMENT ON FUNCTION public.get_company_with_owner_details IS 'Secure access to company owner details, restricted to company owners and superadmins only';