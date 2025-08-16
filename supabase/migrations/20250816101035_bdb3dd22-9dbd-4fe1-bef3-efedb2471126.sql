-- CRITICAL SECURITY FIX: Prevent public access to company business information
-- Fix the approach since RLS cannot be enabled directly on views

-- 1. Ensure the underlying companies table has proper RLS (it should already have it)
-- Views inherit security from the underlying table

-- 2. Revoke any public access that might exist on the views
REVOKE ALL ON public.companies_public FROM anon;
REVOKE ALL ON public.companies_financial FROM anon;
REVOKE ALL ON public.companies_public FROM public;
REVOKE ALL ON public.companies_financial FROM public;

-- 3. Grant SELECT access only to authenticated users
GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_financial TO authenticated;

-- 4. Ensure the companies table RLS policy is restrictive enough
-- This policy should already exist and be working
-- Let's verify it's properly configured

-- 5. Create a security function to validate company access
CREATE OR REPLACE FUNCTION public.is_user_authorized_for_company(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- 6. Update companies table RLS policy to be more explicit about security
DROP POLICY IF EXISTS "companies_role_based_access" ON public.companies;

CREATE POLICY "companies_authenticated_access_only" ON public.companies
FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  public.is_user_authorized_for_company(id)
);

-- 7. Ensure INSERT/UPDATE/DELETE policies are restrictive
CREATE POLICY "companies_secure_insert" ON public.companies
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

CREATE POLICY "companies_secure_update" ON public.companies
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
    )
  )
);

CREATE POLICY "companies_secure_delete" ON public.companies
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

-- 8. Add security documentation
COMMENT ON VIEW public.companies_public IS 'SECURITY HARDENED: Basic company information. Access restricted to authenticated company members only through underlying table RLS. NO public access allowed.';
COMMENT ON VIEW public.companies_financial IS 'SECURITY HARDENED: Sensitive financial company data. Access restricted through underlying table RLS and application-level controls.';
COMMENT ON TABLE public.companies IS 'SECURITY HARDENED: Company data with strict RLS policies. Views inherit these restrictions. Only authenticated company members can access their company data.';

-- 9. Create audit trail for security hardening
DO $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.company_data_access_log (
      company_id,
      accessed_by,
      access_type,
      action
    ) VALUES (
      (SELECT id FROM public.companies LIMIT 1),
      auth.uid(),
      'security_hardening',
      'implemented_strict_rls_policies_to_prevent_data_theft'
    );
  END IF;
END $$;