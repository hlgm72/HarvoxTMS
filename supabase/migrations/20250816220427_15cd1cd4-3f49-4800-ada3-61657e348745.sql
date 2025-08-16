-- Fix security warnings: Set immutable search_path for security functions
-- This prevents potential SQL injection and privilege escalation attacks

-- Update can_access_company_sensitive_data function with immutable search_path
CREATE OR REPLACE FUNCTION public.can_access_company_sensitive_data(company_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is company owner, operations manager, or superadmin for this company
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public';

-- Update log_sensitive_company_access function with immutable search_path
CREATE OR REPLACE FUNCTION public.log_sensitive_company_access(
  company_id_param UUID,
  access_type_param TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    user_role,
    accessed_at
  ) VALUES (
    company_id_param,
    (SELECT auth.uid()),
    access_type_param,
    (SELECT role FROM user_company_roles 
     WHERE user_id = (SELECT auth.uid()) 
     AND company_id = company_id_param 
     AND is_active = true 
     LIMIT 1),
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Update get_companies_financial_data function with immutable search_path
CREATE OR REPLACE FUNCTION public.get_companies_financial_data(company_id_filter UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  street_address TEXT,
  city TEXT,
  state_id CHAR(2),
  zip_code VARCHAR,
  phone TEXT,
  email TEXT,
  plan_type TEXT,
  status TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Sensitive financial fields
  ein VARCHAR,
  mc_number TEXT,
  dot_number TEXT,
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
) AS $$
BEGIN
  -- Log access attempt
  PERFORM log_sensitive_company_access(
    COALESCE(company_id_filter, (SELECT company_id FROM user_company_roles WHERE user_id = (SELECT auth.uid()) AND is_active = true LIMIT 1)),
    'financial_data'
  );

  -- Return financial data only if user has proper access
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
    c.logo_url,
    c.created_at,
    c.updated_at,
    -- Sensitive fields only for authorized users
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.ein ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.mc_number ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.dot_number ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.max_vehicles ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.max_users ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.contract_start_date ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.default_payment_frequency ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.payment_cycle_start_day ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.payment_day ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.default_factoring_percentage ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.default_dispatching_percentage ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.default_leasing_percentage ELSE NULL END,
    CASE WHEN can_access_company_sensitive_data(c.id) THEN c.load_assignment_criteria ELSE NULL END
  FROM companies c
  WHERE (company_id_filter IS NULL AND c.id IN (
    SELECT ucr.company_id FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )) OR c.id = company_id_filter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Update get_companies_basic_info function with immutable search_path
CREATE OR REPLACE FUNCTION public.get_companies_basic_info(company_id_filter UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  street_address TEXT,
  city TEXT,
  state_id CHAR(2),
  zip_code VARCHAR,
  phone TEXT,
  email TEXT,
  plan_type TEXT,
  status TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Return only basic company information - safe for all company members
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
    c.logo_url,
    c.created_at,
    c.updated_at
  FROM companies c
  WHERE (company_id_filter IS NULL AND c.id IN (
    SELECT ucr.company_id FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )) OR c.id = company_id_filter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';