-- ========================================
-- PERFORMANCE FIX: Optimize RLS policies on companies table
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "companies_select_own_company_only" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_superadmin_only" ON public.companies;
DROP POLICY IF EXISTS "companies_update_authorized_roles_only" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_superadmin_only" ON public.companies;

-- Recreate policies with optimized auth function calls
-- Fix 1: SELECT policy - optimized auth function calls
CREATE POLICY "companies_select_own_company_only" ON public.companies
FOR SELECT
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND (
    -- User is a member of this company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = companies.id
      AND is_active = true
    )
    OR 
    -- User is a superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- Fix 2: INSERT policy - optimized auth function calls
CREATE POLICY "companies_insert_superadmin_only" ON public.companies
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Fix 3: UPDATE policy - optimized auth function calls
CREATE POLICY "companies_update_authorized_roles_only" ON public.companies
FOR UPDATE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND (
    -- User is company owner/operations manager for this company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = companies.id
      AND role IN ('company_owner', 'operations_manager')
      AND is_active = true
    )
    OR 
    -- User is a superadmin
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
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND (
    -- User is company owner/operations manager for this company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = companies.id
      AND role IN ('company_owner', 'operations_manager')
      AND is_active = true
    )
    OR 
    -- User is a superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- Fix 4: DELETE policy - optimized auth function calls
CREATE POLICY "companies_delete_superadmin_only" ON public.companies
FOR DELETE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Add comments for documentation
COMMENT ON POLICY "companies_select_own_company_only" ON public.companies IS 
'Optimized RLS policy: Users can view companies they are members of or all companies if superadmin. Uses SELECT subqueries for auth functions to improve performance.';

COMMENT ON POLICY "companies_insert_superadmin_only" ON public.companies IS 
'Optimized RLS policy: Only superadmins can create new companies. Uses SELECT subqueries for auth functions to improve performance.';

COMMENT ON POLICY "companies_update_authorized_roles_only" ON public.companies IS 
'Optimized RLS policy: Company owners, operations managers, and superadmins can update company data. Uses SELECT subqueries for auth functions to improve performance.';

COMMENT ON POLICY "companies_delete_superadmin_only" ON public.companies IS 
'Optimized RLS policy: Only superadmins can delete companies. Uses SELECT subqueries for auth functions to improve performance.';