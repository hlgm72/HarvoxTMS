-- Add comprehensive access logging and finalize security implementation

-- Create a unified access logging function for all business data access
CREATE OR REPLACE FUNCTION log_business_data_access(
  entity_type TEXT,
  entity_id UUID,
  access_action TEXT DEFAULT 'view'
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
    accessed_at,
    ip_address,
    user_agent
  ) VALUES (
    entity_id,
    (SELECT auth.uid()),
    entity_type,
    access_action,
    now(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the operation if logging fails
  NULL;
END;
$$;

-- Create a comprehensive security validation function
CREATE OR REPLACE FUNCTION validate_business_data_access(
  entity_type TEXT,
  company_id_param UUID,
  required_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN required_role = 'member' THEN
      -- Basic company membership required
      EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = (SELECT auth.uid())
        AND company_id = company_id_param
        AND is_active = true
      )
    WHEN required_role = 'financial' THEN
      -- Financial access required
      EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = (SELECT auth.uid())
        AND company_id = company_id_param
        AND role IN ('company_owner', 'operations_manager', 'superadmin')
        AND is_active = true
      )
    ELSE false
  END
  AND (SELECT auth.uid()) IS NOT NULL
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false;
$$;

-- Update the companies_financial_data view to use the new validation
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
  -- Sensitive fields only visible to users with financial access
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.ein ELSE NULL END as ein,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.mc_number ELSE NULL END as mc_number,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.dot_number ELSE NULL END as dot_number,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.owner_name ELSE NULL END as owner_name,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.owner_email ELSE NULL END as owner_email,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.owner_phone ELSE NULL END as owner_phone,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.owner_title ELSE NULL END as owner_title,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.max_vehicles ELSE NULL END as max_vehicles,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.max_users ELSE NULL END as max_users,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.contract_start_date ELSE NULL END as contract_start_date,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.default_payment_frequency ELSE NULL END as default_payment_frequency,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.payment_cycle_start_day ELSE NULL END as payment_cycle_start_day,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.payment_day ELSE NULL END as payment_day,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.default_factoring_percentage ELSE NULL END as default_factoring_percentage,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.default_dispatching_percentage ELSE NULL END as default_dispatching_percentage,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.default_leasing_percentage ELSE NULL END as default_leasing_percentage,
  CASE WHEN validate_business_data_access('companies_financial', c.id, 'financial') 
       THEN c.load_assignment_criteria ELSE NULL END as load_assignment_criteria
FROM companies c
WHERE validate_business_data_access('companies_basic', c.id, 'member');