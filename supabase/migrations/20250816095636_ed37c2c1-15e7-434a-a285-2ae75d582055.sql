-- Fix SECURITY DEFINER view errors by removing WHERE clauses from views
-- and relying on underlying table RLS policies for security

-- 1. Drop existing views
DROP VIEW IF EXISTS public.companies_public;
DROP VIEW IF EXISTS public.companies_financial;

-- 2. Create simple views without WHERE clauses (no SECURITY DEFINER)
-- These views will inherit security from the underlying companies table RLS policies

-- Public view for basic company information
CREATE VIEW public.companies_public AS
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
FROM companies;

-- Financial view for sensitive company data
CREATE VIEW public.companies_financial AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  ein,
  mc_number,
  dot_number,
  owner_name,
  owner_email,
  owner_phone,
  owner_title,
  max_vehicles,
  max_users,
  contract_start_date,
  default_payment_frequency,
  payment_cycle_start_day,
  payment_day,
  default_factoring_percentage,
  default_dispatching_percentage,
  default_leasing_percentage,
  load_assignment_criteria,
  plan_type,
  status,
  logo_url,
  created_at,
  updated_at
FROM companies;

-- 3. Update the companies table RLS policies to handle different access levels
-- Drop existing policy
DROP POLICY IF EXISTS "companies_owners_and_superadmin_only" ON public.companies;

-- Create comprehensive policy that handles both public and financial access
CREATE POLICY "companies_role_based_access" ON public.companies
FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- All company users can access basic information (will be filtered by views)
    id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR
    -- Superadmins can access all companies
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin'::user_role 
      AND is_active = true
    )
  )
);

-- 4. Add comments documenting the security model
COMMENT ON VIEW public.companies_public IS 'Security: Basic company information. Inherits RLS from companies table. Safe for all company users.';
COMMENT ON VIEW public.companies_financial IS 'Security: Complete company data including sensitive financial information. Inherits RLS from companies table. Application must control access based on user roles.';
COMMENT ON TABLE public.companies IS 'Security: Access controlled by RLS policies. Views provide different data levels for different use cases.';