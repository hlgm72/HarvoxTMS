-- CRITICAL SECURITY FIX: Prevent public access to company business information
-- Issue: companies_public view is publicly readable, allowing competitors to steal business data

-- 1. Ensure companies_public view has proper RLS protection
-- The view should inherit RLS from companies table, but let's make it explicit

-- Drop any existing policies on the views
DROP POLICY IF EXISTS "companies_public_access" ON public.companies_public;
DROP POLICY IF EXISTS "companies_financial_access" ON public.companies_financial;

-- 2. Enable RLS on both views (if not already enabled)
ALTER VIEW public.companies_public ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.companies_financial ENABLE ROW LEVEL SECURITY;

-- 3. Create explicit RLS policies for companies_public view
-- Only authenticated company users can see basic company info for their companies
CREATE POLICY "companies_public_authenticated_only" ON public.companies_public
FOR SELECT
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  (
    -- User is member of this company
    id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
      AND user_company_roles.is_active = true
    ) OR
    -- User is superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
      AND user_company_roles.role = 'superadmin'
      AND user_company_roles.is_active = true
    )
  )
);

-- 4. Create explicit RLS policies for companies_financial view
-- Only authenticated users with financial access can see financial data
CREATE POLICY "companies_financial_restricted_access" ON public.companies_financial
FOR SELECT
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  (
    -- User has financial access role in this company
    id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
      AND user_company_roles.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND user_company_roles.is_active = true
    )
  )
);

-- 5. Ensure no public access is granted
-- Revoke any public access that might exist
REVOKE ALL ON public.companies_public FROM anon;
REVOKE ALL ON public.companies_financial FROM anon;
REVOKE ALL ON public.companies_public FROM public;
REVOKE ALL ON public.companies_financial FROM public;

-- 6. Grant appropriate access to authenticated users only
GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_financial TO authenticated;

-- 7. Add security documentation
COMMENT ON VIEW public.companies_public IS 'SECURITY: Basic company information. Access restricted to authenticated company members only. No public access allowed.';
COMMENT ON VIEW public.companies_financial IS 'SECURITY: Sensitive financial company data. Access restricted to company owners, operations managers, and superadmins only.';

-- 8. Log this security fix
INSERT INTO public.company_data_access_log (
  company_id,
  accessed_by,
  access_type,
  action
) 
SELECT 
  c.id,
  (SELECT auth.uid()),
  'security_fix',
  'restricted_public_access_to_company_data'
FROM public.companies c
WHERE (SELECT auth.uid()) IS NOT NULL
LIMIT 1;