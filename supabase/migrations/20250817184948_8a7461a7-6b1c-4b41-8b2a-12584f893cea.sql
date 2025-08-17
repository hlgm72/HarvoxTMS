-- Drop existing functions and recreate with proper security enhancements
DROP FUNCTION IF EXISTS public.get_companies_basic_info(uuid);
DROP FUNCTION IF EXISTS public.get_companies_financial_data(uuid);

-- Enhanced audit logging for company data access
CREATE OR REPLACE FUNCTION public.log_company_access_audit(
  company_id_param UUID, 
  access_type_param TEXT, 
  fields_accessed_param TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action,
    accessed_at
  ) VALUES (
    company_id_param,
    auth.uid(),
    access_type_param,
    format('company_data_access_fields:%s', array_to_string(fields_accessed_param, ',')),
    now()
  );
END;
$$;

-- Recreate secure RPC functions with enhanced logging and stricter access controls
CREATE OR REPLACE FUNCTION public.get_companies_basic_info(target_company_id UUID DEFAULT NULL)
RETURNS TABLE(
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
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate user can access company data
  IF target_company_id IS NOT NULL THEN
    IF NOT user_can_access_company(target_company_id) THEN
      RAISE EXCEPTION 'Unauthorized access to company data';
    END IF;
    
    -- Log access to specific company basic info
    PERFORM log_company_access_audit(
      target_company_id, 
      'basic_info', 
      ARRAY['name', 'address', 'contact', 'status']
    );
  ELSE
    -- Log access to all companies basic info
    PERFORM log_company_access_audit(
      NULL, 
      'basic_info_list', 
      ARRAY['name', 'address', 'contact', 'status']
    );
  END IF;

  RETURN QUERY
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
  WHERE (target_company_id IS NULL OR c.id = target_company_id)
    AND user_can_access_company(c.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_companies_financial_data(target_company_id UUID DEFAULT NULL)
RETURNS TABLE(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Strict validation for financial data access
  IF target_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = target_company_id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Unauthorized access to sensitive financial data';
    END IF;
    
    -- Log access to specific company financial data
    PERFORM log_company_access_audit(
      target_company_id, 
      'financial_data', 
      ARRAY['ein', 'mc_number', 'dot_number', 'financial_settings']
    );
  ELSE
    -- For superadmins accessing all companies financial data
    IF NOT user_is_superadmin() THEN
      RAISE EXCEPTION 'Only superadmins can access all companies financial data';
    END IF;
    
    -- Log superadmin access to all financial data
    PERFORM log_company_access_audit(
      NULL, 
      'financial_data_list', 
      ARRAY['ein', 'mc_number', 'dot_number', 'financial_settings']
    );
  END IF;

  RETURN QUERY
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
  WHERE (target_company_id IS NULL OR c.id = target_company_id)
    AND (
      user_is_superadmin() OR
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = c.id
        AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND ucr.is_active = true
      )
    );
END;
$$;