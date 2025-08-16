-- ========================================
-- SECURITY FIX: Apply RLS policies to companies_basic_info view
-- ========================================

-- Enable RLS on the companies_basic_info view
ALTER VIEW public.companies_basic_info SET (security_invoker = false);

-- Drop the view and recreate with proper RLS inheritance
DROP VIEW IF EXISTS public.companies_basic_info;

-- Create the view again with proper structure
-- The view will inherit RLS from the underlying companies table
CREATE VIEW public.companies_basic_info 
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
  plan_type,
  status,
  logo_url,
  created_at,
  updated_at
FROM public.companies;

-- Grant proper permissions to the view
GRANT SELECT ON public.companies_basic_info TO authenticated;
REVOKE ALL ON public.companies_basic_info FROM anon, public;

-- Add additional documentation
COMMENT ON VIEW public.companies_basic_info IS 
'Non-sensitive view of company data excluding financial and personal owner information. Inherits RLS policies from companies table.';

-- ========================================
-- SECURITY ENHANCEMENT: Create function to check data sensitivity access
-- ========================================

CREATE OR REPLACE FUNCTION public.check_data_access_permissions(
  table_name text,
  operation text DEFAULT 'SELECT'
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    WHEN table_name = 'companies' AND operation = 'SELECT' THEN
      -- Must have active role in a company or be superadmin
      EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = auth.uid()
        AND is_active = true
        AND (
          role = 'superadmin'
          OR company_id IN (
            SELECT id FROM companies
            WHERE auth.uid() IN (
              SELECT user_id FROM user_company_roles
              WHERE company_id = companies.id AND is_active = true
            )
          )
        )
      )
    ELSE false
  END;
$$;

-- ========================================
-- ADDITIONAL SECURITY: Add rate limiting hint
-- ========================================

COMMENT ON TABLE public.companies IS 
'SECURITY: Contains highly sensitive business data. Access is restricted via RLS policies. Consider implementing rate limiting for queries to this table in the application layer.';

-- ========================================
-- DOCUMENTATION: Security compliance notes
-- ========================================

COMMENT ON FUNCTION public.can_access_company_financial_data(uuid) IS 
'SECURITY FUNCTION: Restricts access to financial company data (EIN, percentages, financial settings) to company owners and superadmins only. Used for data protection compliance.';

COMMENT ON FUNCTION public.audit_company_data_access() IS 
'AUDIT FUNCTION: Logs all access to company data for security monitoring and compliance auditing. Required for SOC2 and similar compliance frameworks.';

-- Create index for better audit performance
CREATE INDEX IF NOT EXISTS idx_company_data_access_log_company_accessed 
ON company_data_access_log(company_id, accessed_at DESC, accessed_by);

CREATE INDEX IF NOT EXISTS idx_company_data_access_log_user_activity
ON company_data_access_log(accessed_by, accessed_at DESC, action);