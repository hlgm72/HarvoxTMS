-- Fix critical security issue: Secure company data access
-- This prevents competitors from stealing sensitive business information

-- First, ensure RLS is enabled on the base companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create security functions to validate company data access
CREATE OR REPLACE FUNCTION can_access_company_basic_data(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = company_id_param
    AND ucr.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION can_access_company_financial_data(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = company_id_param
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  );
$$;

-- Update companies_basic_info view with security filter
DROP VIEW IF EXISTS companies_basic_info;
CREATE VIEW companies_basic_info 
WITH (security_invoker = true) AS
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
  c.updated_at
FROM companies c
WHERE can_access_company_basic_data(c.id);

-- Update companies_financial_data view with stricter security filter
DROP VIEW IF EXISTS companies_financial_data;
CREATE VIEW companies_financial_data 
WITH (security_invoker = true) AS
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
  c.ein,
  c.mc_number,
  c.dot_number,
  c.owner_name,
  c.owner_email,
  c.owner_phone,
  c.owner_title,
  c.max_vehicles,
  c.max_users,
  c.contract_start_date,
  c.default_payment_frequency,
  c.payment_cycle_start_day,
  c.payment_day,
  c.default_factoring_percentage,
  c.default_dispatching_percentage,
  c.default_leasing_percentage,
  c.load_assignment_criteria
FROM companies c
WHERE can_access_company_financial_data(c.id);

-- Drop and recreate audit function with correct signature
DROP FUNCTION IF EXISTS log_sensitive_company_access(UUID, TEXT);

CREATE OR REPLACE FUNCTION log_sensitive_company_access(
  company_id_param UUID,
  access_type_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if user has access
  IF (access_type_param = 'financial_data' AND can_access_company_financial_data(company_id_param)) OR
     (access_type_param = 'basic_data' AND can_access_company_basic_data(company_id_param)) THEN
    
    INSERT INTO company_sensitive_data_access_log (
      company_id,
      accessed_by,
      access_type,
      user_role,
      accessed_at
    ) VALUES (
      company_id_param,
      auth.uid(),
      access_type_param,
      (
        SELECT role 
        FROM user_company_roles 
        WHERE user_id = auth.uid() 
        AND company_id = company_id_param 
        AND is_active = true 
        LIMIT 1
      ),
      now()
    );
  END IF;
END;
$$;