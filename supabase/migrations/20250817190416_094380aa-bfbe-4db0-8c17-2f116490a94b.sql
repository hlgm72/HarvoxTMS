-- Fix the get_companies_financial_data function to match actual table schema
-- The companies table doesn't have owner_name, owner_email, etc. columns

DROP FUNCTION IF EXISTS get_companies_financial_data(target_company_id uuid);

CREATE OR REPLACE FUNCTION get_companies_financial_data(target_company_id uuid DEFAULT NULL)
RETURNS TABLE(
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
  updated_at timestamptz,
  ein varchar,
  mc_number text,
  dot_number text,
  max_vehicles integer,
  max_users integer,
  contract_start_date date,
  default_payment_frequency text,
  payment_cycle_start_day integer,
  payment_day text,
  default_factoring_percentage numeric,
  default_dispatching_percentage numeric,
  default_leasing_percentage numeric,
  load_assignment_criteria text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user authentication
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- If target_company_id is provided, return single company
  IF target_company_id IS NOT NULL THEN
    -- Log access for audit trail
    PERFORM log_company_data_access(target_company_id, 'financial_data', 'view');

    -- Check if user has financial access to this specific company
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = target_company_id
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Access denied to company financial data';
    END IF;

    RETURN QUERY
    SELECT 
      c.id, c.name, c.street_address, c.state_id, c.zip_code, c.city,
      c.phone, c.email, c.logo_url, c.plan_type, c.status,
      c.created_at, c.updated_at, c.ein, c.mc_number, c.dot_number,
      c.max_vehicles, c.max_users, c.contract_start_date,
      c.default_payment_frequency, c.payment_cycle_start_day, c.payment_day,
      c.default_factoring_percentage, c.default_dispatching_percentage,
      c.default_leasing_percentage, c.load_assignment_criteria
    FROM companies c
    WHERE c.id = target_company_id;
  ELSE
    -- Return all companies user has financial access to
    RETURN QUERY
    SELECT 
      c.id, c.name, c.street_address, c.state_id, c.zip_code, c.city,
      c.phone, c.email, c.logo_url, c.plan_type, c.status,
      c.created_at, c.updated_at, c.ein, c.mc_number, c.dot_number,
      c.max_vehicles, c.max_users, c.contract_start_date,
      c.default_payment_frequency, c.payment_cycle_start_day, c.payment_day,
      c.default_factoring_percentage, c.default_dispatching_percentage,
      c.default_leasing_percentage, c.load_assignment_criteria
    FROM companies c
    JOIN user_company_roles ucr ON c.id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true;
  END IF;
END;
$$;

-- Also create a separate function to get owner details from the dedicated table
CREATE OR REPLACE FUNCTION get_company_owner_details(target_company_id uuid)
RETURNS TABLE(
  company_id uuid,
  owner_name text,
  owner_email text,
  owner_phone text,
  owner_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user authentication
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has owner access to this specific company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = target_company_id
    AND ucr.role IN ('company_owner', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied to company owner details';
  END IF;

  -- Log access for audit trail
  PERFORM log_company_data_access(target_company_id, 'owner_details', 'view');

  RETURN QUERY
  SELECT 
    cod.company_id,
    cod.owner_name,
    cod.owner_email,
    cod.owner_phone,
    cod.owner_title
  FROM company_owner_details cod
  WHERE cod.company_id = target_company_id;
END;
$$;