-- Fix RLS performance issue with proper type casting
-- Replace auth.uid() with (select auth.uid()) and fix role enum casting

-- Drop the current policy
DROP POLICY IF EXISTS "companies_basic_info_members_only" ON public.companies;

-- Create optimized policy with proper auth function usage and type casting
CREATE POLICY "companies_basic_info_members_only"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated and not anonymous (optimized auth calls)
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- User belongs to this company (basic access)
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = companies.id
      AND ucr.is_active = true
    )
    OR
    -- User is superadmin (full access)
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.role = 'superadmin'::user_role
      AND ucr.is_active = true
    )
  )
);

-- Also optimize other companies policies with proper type casting
DROP POLICY IF EXISTS "companies_delete_superadmin_only" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_superadmin_only" ON public.companies;
DROP POLICY IF EXISTS "companies_update_authorized_roles_only" ON public.companies;

-- Recreate DELETE policy with optimized auth calls
CREATE POLICY "companies_delete_superadmin_only"
ON public.companies
FOR DELETE
TO public
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'::user_role
    AND is_active = true
  )
);

-- Recreate INSERT policy with optimized auth calls
CREATE POLICY "companies_insert_superadmin_only"
ON public.companies
FOR INSERT
TO public
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'::user_role
    AND is_active = true
  )
);

-- Recreate UPDATE policy with optimized auth calls and proper enum casting
CREATE POLICY "companies_update_authorized_roles_only"
ON public.companies
FOR UPDATE
TO public
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = companies.id
      AND role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'::user_role
      AND is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = companies.id
      AND role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'::user_role
      AND is_active = true
    )
  )
);

-- Verify the policies are created correctly
SELECT 
  policyname,
  cmd,
  'Performance optimized' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'companies'
ORDER BY policyname;