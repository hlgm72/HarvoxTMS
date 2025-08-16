-- CRITICAL SECURITY FIX: Prevent public access to company business information
-- Clean up existing policies first, then create secure ones

-- 1. Drop all existing policies on companies table
DROP POLICY IF EXISTS "companies_authenticated_access_only" ON public.companies;
DROP POLICY IF EXISTS "companies_role_based_access" ON public.companies;
DROP POLICY IF EXISTS "companies_secure_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_secure_update" ON public.companies;
DROP POLICY IF EXISTS "companies_secure_delete" ON public.companies;

-- 2. Revoke any public access that might exist on the views
REVOKE ALL ON public.companies_public FROM anon;
REVOKE ALL ON public.companies_financial FROM anon;
REVOKE ALL ON public.companies_public FROM public;
REVOKE ALL ON public.companies_financial FROM public;

-- 3. Grant SELECT access only to authenticated users
GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_financial TO authenticated;

-- 4. Create a security function to validate company access (if not exists)
CREATE OR REPLACE FUNCTION public.is_user_authorized_for_company(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = true THEN false
    ELSE (
      EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = auth.uid()
        AND company_id = company_id_param
        AND is_active = true
      ) OR EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = auth.uid()
        AND role = 'superadmin'
        AND is_active = true
      )
    )
  END;
$$;

-- 5. Create strict RLS policies for companies table
CREATE POLICY "companies_authenticated_members_only" ON public.companies
FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  public.is_user_authorized_for_company(id)
);

CREATE POLICY "companies_superadmin_insert_only" ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

CREATE POLICY "companies_owners_and_superadmin_update" ON public.companies
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = companies.id
    AND role IN ('company_owner', 'superadmin')
    AND is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = companies.id
    AND role IN ('company_owner', 'superadmin')
    AND is_active = true
  )
);

CREATE POLICY "companies_superadmin_delete_only" ON public.companies
FOR DELETE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- 6. Add comprehensive security documentation
COMMENT ON VIEW public.companies_public IS 'SECURITY HARDENED: Basic company information. Access restricted to authenticated company members only. NO anonymous or public access. Views inherit RLS from companies table.';
COMMENT ON VIEW public.companies_financial IS 'SECURITY HARDENED: Sensitive financial company data. Access restricted to authenticated company members with application-level role checking. NO anonymous or public access.';
COMMENT ON TABLE public.companies IS 'SECURITY HARDENED: Company data protected with strict RLS policies. Only authenticated company members can view their company data. Insert/Delete restricted to superadmins. Update restricted to company owners and superadmins.';
COMMENT ON FUNCTION public.is_user_authorized_for_company(UUID) IS 'SECURITY FUNCTION: Validates if authenticated user has access to specified company data. Returns false for anonymous users.';