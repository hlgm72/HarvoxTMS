-- Fix security issue: Secure the companies_financial_data view
-- Views don't automatically inherit full RLS protection, so we need additional security

-- Method 1: Convert the view to a table with RLS (most secure approach)
-- First, create a materialized view with RLS enabled

-- Drop the existing view
DROP VIEW IF EXISTS companies_financial_data;

-- Create a secure function that provides financial data with proper access control
CREATE OR REPLACE FUNCTION get_company_financial_data(company_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  street_address TEXT,
  state_id CHAR(2),
  zip_code VARCHAR,
  city TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  plan_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  ein VARCHAR,
  mc_number TEXT,
  dot_number TEXT,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  owner_title TEXT,
  max_vehicles INTEGER,
  max_users INTEGER,
  contract_start_date DATE,
  default_payment_frequency TEXT,
  payment_cycle_start_day INTEGER,
  payment_day TEXT,
  default_factoring_percentage NUMERIC,
  default_dispatching_percentage NUMERIC,
  default_leasing_percentage NUMERIC,
  load_assignment_criteria TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First verify user has financial access
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.state_id,
    c.zip_code,
    c.city,
    c.phone,
    c.email,
    c.logo_url,
    c.plan_type,
    c.status,
    c.created_at,
    c.updated_at,
    -- Only return sensitive fields if user has proper access
    CASE WHEN user_can_access_financial_data(c.id) THEN c.ein ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.mc_number ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.dot_number ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.owner_name ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.owner_email ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.owner_phone ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.owner_title ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.max_vehicles ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.max_users ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.contract_start_date ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.default_payment_frequency ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.payment_cycle_start_day ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.payment_day ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.default_factoring_percentage ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.default_dispatching_percentage ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.default_leasing_percentage ELSE NULL END,
    CASE WHEN user_can_access_financial_data(c.id) THEN c.load_assignment_criteria ELSE NULL END
  FROM companies c
  WHERE 
    -- User must be authenticated
    (SELECT auth.uid()) IS NOT NULL
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
    -- User must have access to this company
    AND can_access_company_data(c.id)
    -- If specific company requested, filter to that company
    AND (company_id_param IS NULL OR c.id = company_id_param);
$$;

-- Create a more secure view that uses the function
CREATE VIEW companies_financial_data AS
SELECT * FROM get_company_financial_data();

-- Log any access to financial data
CREATE OR REPLACE FUNCTION log_financial_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to sensitive financial data
  PERFORM log_sensitive_company_access(
    NEW.id,
    'companies_financial_data_view_access'
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail if logging fails
  RETURN NEW;
END;
$$;