-- SECURITY FIX: Protect sensitive company financial data with role-based access
-- Problem: All company users can see EIN, owner personal info, and financial percentages
-- Solution: Create secure views and restrict sensitive data access

-- 1. Create a security definer function to check user role in company
CREATE OR REPLACE FUNCTION public.get_user_role_in_company(company_id_param UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM user_company_roles 
  WHERE user_id = auth.uid() 
  AND company_id = company_id_param 
  AND is_active = true
  LIMIT 1;
$$;

-- 2. Create a security definer function to check if user can access financial data
CREATE OR REPLACE FUNCTION public.can_access_company_financial_data(company_id_param UUID)
RETURNS boolean
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND company_id = company_id_param
    AND role IN ('company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role)
    AND is_active = true
  );
$$;

-- 3. Create a public view for basic company information (safe for all company users)
CREATE OR REPLACE VIEW public.companies_public AS
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
WHERE auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'::user_role 
      AND is_active = true
    )
  );

-- 4. Create a restricted view for financial data (owners and operations managers only)
CREATE OR REPLACE VIEW public.companies_financial AS
SELECT 
  c.id,
  c.name,
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
  c.load_assignment_criteria,
  c.created_at,
  c.updated_at
FROM companies c
WHERE auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND can_access_company_financial_data(c.id);

-- 5. Update the main companies table RLS to be more restrictive
-- Remove the broad SELECT policy that allows all company users to see everything
DROP POLICY IF EXISTS "companies_secure_select" ON public.companies;

-- Create a new restrictive policy - only owners and superadmins can see full company data
CREATE POLICY "companies_full_access_restricted" ON public.companies
FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    get_user_role_in_company(id) = 'company_owner'::user_role OR
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'::user_role 
      AND is_active = true
    )
  )
);

-- 6. Add comments documenting the security model
COMMENT ON VIEW public.companies_public IS 'Security: Basic company information visible to all company users. Does not contain sensitive financial or personal data.';
COMMENT ON VIEW public.companies_financial IS 'Security: Financial and sensitive company data. Restricted to company owners, operations managers, and superadmins only.';
COMMENT ON TABLE public.companies IS 'Security: Full company data restricted to company owners and superadmins only. Use companies_public or companies_financial views for appropriate access levels.';

-- 7. Create an audit log for sensitive data access
CREATE TABLE IF NOT EXISTS public.company_sensitive_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  accessed_by UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'financial_view', 'full_table', etc.
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_role user_role,
  ip_address INET,
  user_agent TEXT
);

ALTER TABLE public.company_sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only superadmins can see audit logs
CREATE POLICY "sensitive_data_audit_superadmin_only" ON public.company_sensitive_data_access_log
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'::user_role 
    AND is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'::user_role 
    AND is_active = true
  )
);