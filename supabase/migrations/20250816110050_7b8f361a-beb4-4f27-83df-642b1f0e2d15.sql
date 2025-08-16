-- Fix RLS performance warnings by optimizing auth function calls

-- Fix companies policy
DROP POLICY IF EXISTS "companies_authenticated_members_access" ON public.companies;

CREATE POLICY "companies_authenticated_members_access" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- User is a member of this company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = companies.id
      AND is_active = true
    )
    -- OR user is a superadmin
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- Fix user_company_roles policy
DROP POLICY IF EXISTS "user_company_roles_access_policy" ON public.user_company_roles;

CREATE POLICY "user_company_roles_access_policy" 
ON public.user_company_roles 
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND check_user_role_access(user_id, company_id)
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (user_id = (SELECT auth.uid()) OR check_is_superadmin())
);