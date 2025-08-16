-- SECURITY FIX: Protect sensitive company financial data with role-based access
-- This is a clean migration that handles existing objects properly

-- 1. Create helper functions for role checking
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

-- 2. Create secure views for different access levels
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

-- 3. Update main companies table RLS to be more restrictive
DROP POLICY IF EXISTS "companies_secure_select" ON public.companies;

CREATE POLICY "companies_owners_and_superadmin_only" ON public.companies
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

-- 4. Add security documentation
COMMENT ON VIEW public.companies_public IS 'Security: Basic company information visible to all company users. Does not contain sensitive financial or personal data.';
COMMENT ON VIEW public.companies_financial IS 'Security: Financial and sensitive company data. Restricted to company owners, operations managers, and superadmins only.';
COMMENT ON TABLE public.companies IS 'Security: Full company data restricted to company owners and superadmins only. Use companies_public or companies_financial views for appropriate access levels.';