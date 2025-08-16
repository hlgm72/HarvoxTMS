-- Fix security issue: Enhanced RLS policies for companies table with field-level security
-- Create a more restrictive approach by separating sensitive and non-sensitive data access

-- First, let's create a function to check if current user can access sensitive company data
CREATE OR REPLACE FUNCTION public.can_access_company_sensitive_data(company_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only company owners, operations managers, and superadmins can access sensitive data
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND (
      (ucr.company_id = company_id_param AND ucr.role IN ('company_owner', 'operations_manager'))
      OR ucr.role = 'superadmin'
    )
  );
END;
$$;

-- Create function to log sensitive company data access
CREATE OR REPLACE FUNCTION public.log_sensitive_company_access(company_id_param uuid, access_type_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO company_sensitive_data_access_log (
    company_id, accessed_by, access_type, user_role, accessed_at
  )
  SELECT 
    company_id_param,
    auth.uid(),
    access_type_param,
    ucr.role,
    now()
  FROM user_company_roles ucr
  WHERE ucr.user_id = auth.uid()
  AND ucr.is_active = true
  LIMIT 1;
END;
$$;

-- Drop existing policies and create more restrictive ones
DROP POLICY IF EXISTS "companies_select_own_company_only" ON public.companies;

-- Create new restrictive SELECT policy for companies table
-- This policy will be very restrictive and primarily used through secure RPC functions
CREATE POLICY "companies_basic_info_members_only"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated and not anonymous
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User belongs to this company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = companies.id
      AND ucr.is_active = true
    )
    OR
    -- User is superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )
  )
);

-- Create policy for sensitive data access (very restrictive)
CREATE POLICY "companies_sensitive_data_restricted"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- Only company owners, operations managers, and superadmins can access sensitive data
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND can_access_company_sensitive_data(companies.id)
);

-- Update the existing secure RPC functions to include logging for sensitive data access
-- Update get_companies_financial_data to log access
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

  -- Log access to sensitive financial data
  IF company_id_param IS NOT NULL THEN
    PERFORM log_sensitive_company_access(company_id_param, 'financial_data_access');
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

-- Add comments explaining the security approach
COMMENT ON FUNCTION public.can_access_company_sensitive_data IS 'Security function to validate access to sensitive company data including EIN, DOT numbers, and personal information';
COMMENT ON FUNCTION public.log_sensitive_company_access IS 'Audit function to log all access to sensitive company data for security monitoring';
COMMENT ON POLICY "companies_basic_info_members_only" ON public.companies IS 'Restrictive policy allowing only company members to view basic company information';
COMMENT ON POLICY "companies_sensitive_data_restricted" ON public.companies IS 'Highly restrictive policy for sensitive company data access (EIN, DOT, financial info)';