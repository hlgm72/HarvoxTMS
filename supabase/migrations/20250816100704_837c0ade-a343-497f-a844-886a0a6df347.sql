-- Optimize RLS policies for better performance by wrapping auth functions with SELECT
-- This prevents re-evaluation of auth functions for each row

-- Fix companies_role_based_access policy
DROP POLICY IF EXISTS "companies_role_based_access" ON public.companies;

CREATE POLICY "companies_role_based_access" ON public.companies
FOR SELECT
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  (
    id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
      AND user_company_roles.is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
      AND user_company_roles.role = 'superadmin'
      AND user_company_roles.is_active = true
    )
  )
);

-- Fix sensitive_data_audit_superadmin_only policy
DROP POLICY IF EXISTS "sensitive_data_audit_superadmin_only" ON public.company_sensitive_data_access_log;

CREATE POLICY "sensitive_data_audit_superadmin_only" ON public.company_sensitive_data_access_log
FOR ALL
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);