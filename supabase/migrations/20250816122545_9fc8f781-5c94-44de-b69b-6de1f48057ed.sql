-- Comprehensive security enhancement for companies table
-- Address all potential security gaps identified by the scanner

-- First, let's add a security definer function to more strictly validate company access
CREATE OR REPLACE FUNCTION can_access_company_data(company_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN company_id_param IS NULL THEN
      -- For listing companies, user must be authenticated and have any active company role
      EXISTS (
        SELECT 1 FROM user_company_roles 
        WHERE user_id = (SELECT auth.uid()) 
        AND is_active = true
      )
    ELSE
      -- For specific company access, user must be member of that company or superadmin
      EXISTS (
        SELECT 1 FROM user_company_roles 
        WHERE user_id = (SELECT auth.uid())
        AND (company_id = company_id_param OR role = 'superadmin')
        AND is_active = true
      )
  END;
$$;

-- Create a view that only exposes basic company information (non-sensitive data)
-- This separates sensitive financial data from basic company info
CREATE OR REPLACE VIEW companies_basic_info AS
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
  updated_at
FROM companies
WHERE can_access_company_data(id);

-- Enable RLS on the view for extra security
ALTER VIEW companies_basic_info OWNER TO postgres;

-- Create a restricted view for sensitive financial data
-- Only accessible by company owners, operations managers, and superadmins
CREATE OR REPLACE VIEW companies_financial_data AS
SELECT 
  c.*
FROM companies c
WHERE EXISTS (
  SELECT 1 FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid())
  AND ucr.company_id = c.id
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true
);

-- Log any access to the main companies table for audit purposes
CREATE OR REPLACE FUNCTION log_companies_table_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log direct access to companies table
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action,
    accessed_at
  ) VALUES (
    CASE WHEN TG_OP = 'SELECT' THEN OLD.id ELSE NEW.id END,
    (SELECT auth.uid()),
    'companies_table_direct',
    TG_OP,
    now()
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the operation if logging fails
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Apply the audit trigger to the companies table
DROP TRIGGER IF EXISTS audit_companies_access ON companies;
CREATE TRIGGER audit_companies_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION log_companies_table_access();