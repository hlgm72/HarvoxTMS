-- Drop existing functions and views, then create new RPC functions

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_companies_basic_info(uuid);
DROP FUNCTION IF EXISTS get_companies_financial_data(uuid);

-- Drop the problematic views
DROP VIEW IF EXISTS companies_basic_info;
DROP VIEW IF EXISTS companies_financial_data;
DROP VIEW IF EXISTS equipment_status_summary;

-- Drop old security functions that are no longer needed
DROP FUNCTION IF EXISTS can_access_company_basic_data(uuid);
DROP FUNCTION IF EXISTS can_access_company_financial_data(uuid);

-- Create new RPC function for basic company data
CREATE OR REPLACE FUNCTION get_companies_basic_info(company_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  city text,
  state_id char(2),
  zip_code varchar,
  phone text,
  email text,
  logo_url text,
  plan_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id, c.name, c.street_address, c.city, c.state_id, c.zip_code,
    c.phone, c.email, c.logo_url, c.plan_type, c.status,
    c.created_at, c.updated_at
  FROM companies c
  WHERE 
    (company_id_param IS NULL OR c.id = company_id_param)
    AND (
      -- Allow postgres superuser
      current_user = 'postgres' OR
      -- Allow users with company access
      EXISTS (
        SELECT 1 FROM user_company_roles ucr 
        WHERE ucr.user_id = auth.uid() 
        AND ucr.company_id = c.id 
        AND ucr.is_active = true
      )
    );
$$;

-- Create new RPC function for financial company data
CREATE OR REPLACE FUNCTION get_companies_financial_data(company_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  city text,
  state_id char(2),
  zip_code varchar,
  phone text,
  email text,
  logo_url text,
  plan_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  ein varchar,
  owner_name text,
  owner_email text,
  owner_phone text,
  owner_title text,
  dot_number text,
  mc_number text,
  default_payment_frequency text,
  payment_cycle_start_day integer,
  payment_day text,
  default_leasing_percentage numeric,
  default_factoring_percentage numeric,
  default_dispatching_percentage numeric,
  load_assignment_criteria text,
  contract_start_date date,
  max_users integer,
  max_vehicles integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id, c.name, c.street_address, c.city, c.state_id, c.zip_code,
    c.phone, c.email, c.logo_url, c.plan_type, c.status,
    c.created_at, c.updated_at,
    c.ein, c.owner_name, c.owner_email, c.owner_phone, c.owner_title,
    c.dot_number, c.mc_number,
    c.default_payment_frequency, c.payment_cycle_start_day, c.payment_day,
    c.default_leasing_percentage, c.default_factoring_percentage, c.default_dispatching_percentage,
    c.load_assignment_criteria, c.contract_start_date, c.max_users, c.max_vehicles
  FROM companies c
  WHERE 
    (company_id_param IS NULL OR c.id = company_id_param)
    AND (
      -- Allow postgres superuser
      current_user = 'postgres' OR
      -- Allow users with financial access (owners, ops managers, superadmins)
      EXISTS (
        SELECT 1 FROM user_company_roles ucr 
        WHERE ucr.user_id = auth.uid() 
        AND ucr.company_id = c.id 
        AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND ucr.is_active = true
      )
    );
$$;