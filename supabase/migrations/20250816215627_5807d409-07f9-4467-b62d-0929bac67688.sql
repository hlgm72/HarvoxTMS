-- Fix RLS performance issue by optimizing auth function calls
-- Replace auth.uid() with (select auth.uid()) to prevent re-evaluation for each row

-- Drop the current policy
DROP POLICY IF EXISTS "companies_basic_info_members_only" ON public.companies;

-- Create optimized policy with proper auth function usage
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
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )
  )
);

-- Also optimize other companies policies for consistency
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
    AND role = 'superadmin'
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
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Recreate UPDATE policy with optimized auth calls
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
      AND role = ANY (ARRAY['company_owner', 'operations_manager'])
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
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
      AND role = ANY (ARRAY['company_owner', 'operations_manager'])
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- Add comments explaining the optimization
COMMENT ON POLICY "companies_basic_info_members_only" ON public.companies IS 'Optimized RLS policy with SELECT-wrapped auth functions to prevent per-row re-evaluation and improve query performance';

-- Verify the policies are created correctly
SELECT 
  policyname,
  cmd,
  'Policy optimized for performance' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'companies'
ORDER BY policyname;