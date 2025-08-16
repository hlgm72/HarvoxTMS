-- Implement field-level security with proper view design
-- Since we can't use WHERE clauses that filter based on user permissions in SECURITY INVOKER views,
-- we need a different approach for protecting sensitive fields

-- Create a function that checks if user can access financial data for a specific company
CREATE OR REPLACE FUNCTION user_can_access_financial_data(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

-- Recreate the financial data view with conditional field access
DROP VIEW IF EXISTS companies_financial_data;

CREATE VIEW companies_financial_data 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  logo_url,
  plan_type,
  status,
  created_at,
  updated_at,
  -- Sensitive fields only visible to authorized users
  CASE WHEN user_can_access_financial_data(id) THEN ein ELSE NULL END as ein,
  CASE WHEN user_can_access_financial_data(id) THEN mc_number ELSE NULL END as mc_number,
  CASE WHEN user_can_access_financial_data(id) THEN dot_number ELSE NULL END as dot_number,
  CASE WHEN user_can_access_financial_data(id) THEN owner_name ELSE NULL END as owner_name,
  CASE WHEN user_can_access_financial_data(id) THEN owner_email ELSE NULL END as owner_email,
  CASE WHEN user_can_access_financial_data(id) THEN owner_phone ELSE NULL END as owner_phone,
  CASE WHEN user_can_access_financial_data(id) THEN owner_title ELSE NULL END as owner_title,
  CASE WHEN user_can_access_financial_data(id) THEN max_vehicles ELSE NULL END as max_vehicles,
  CASE WHEN user_can_access_financial_data(id) THEN max_users ELSE NULL END as max_users,
  CASE WHEN user_can_access_financial_data(id) THEN contract_start_date ELSE NULL END as contract_start_date,
  CASE WHEN user_can_access_financial_data(id) THEN default_payment_frequency ELSE NULL END as default_payment_frequency,
  CASE WHEN user_can_access_financial_data(id) THEN payment_cycle_start_day ELSE NULL END as payment_cycle_start_day,
  CASE WHEN user_can_access_financial_data(id) THEN payment_day ELSE NULL END as payment_day,
  CASE WHEN user_can_access_financial_data(id) THEN default_factoring_percentage ELSE NULL END as default_factoring_percentage,
  CASE WHEN user_can_access_financial_data(id) THEN default_dispatching_percentage ELSE NULL END as default_dispatching_percentage,
  CASE WHEN user_can_access_financial_data(id) THEN default_leasing_percentage ELSE NULL END as default_leasing_percentage,
  CASE WHEN user_can_access_financial_data(id) THEN load_assignment_criteria ELSE NULL END as load_assignment_criteria
FROM companies;