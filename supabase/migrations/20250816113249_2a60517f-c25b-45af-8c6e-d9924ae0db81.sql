-- Fix RLS performance issues in companies table
-- 1. Optimize auth function calls to prevent re-evaluation per row
-- 2. Combine multiple permissive policies into a single optimized policy

-- Drop the existing inefficient policies
DROP POLICY IF EXISTS "companies_basic_info_members_only" ON companies;
DROP POLICY IF EXISTS "companies_sensitive_data_restricted" ON companies;

-- Create a single optimized policy that handles both basic and sensitive data access
-- Using (select auth.uid()) to evaluate once per query instead of per row
CREATE POLICY "companies_optimized_member_access" 
ON companies 
FOR SELECT 
TO authenticated
USING (
  -- Optimize auth function calls by wrapping in SELECT
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- User must be a member of this specific company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = companies.id
      AND is_active = true
    )
    -- OR user is a superadmin (can see all companies)
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- Update the security definer function to also use optimized auth calls
CREATE OR REPLACE FUNCTION public.can_access_company_sensitive_data(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- Also optimize existing UPDATE policy
DROP POLICY IF EXISTS "companies_owners_and_superadmin_update" ON companies;
CREATE POLICY "companies_owners_and_superadmin_update" 
ON companies 
FOR UPDATE 
TO public
USING (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = companies.id
    AND role = ANY (ARRAY['company_owner'::user_role, 'superadmin'::user_role])
    AND is_active = true
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = companies.id
    AND role = ANY (ARRAY['company_owner'::user_role, 'superadmin'::user_role])
    AND is_active = true
  )
);

-- Optimize DELETE policy
DROP POLICY IF EXISTS "companies_superadmin_delete_only" ON companies;
CREATE POLICY "companies_superadmin_delete_only" 
ON companies 
FOR DELETE 
TO public
USING (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Optimize INSERT policy
DROP POLICY IF EXISTS "companies_superadmin_insert_only" ON companies;
CREATE POLICY "companies_superadmin_insert_only" 
ON companies 
FOR INSERT 
TO public
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Add comment documenting the performance optimization
COMMENT ON TABLE companies IS 'Company information with optimized RLS policies. Auth functions wrapped in SELECT for performance, single policy combines basic and sensitive data access control.';