-- Fix performance warnings: Optimize RLS policies to cache auth function calls
-- This prevents re-evaluation of auth functions for each row

-- Drop existing policies
DROP POLICY IF EXISTS "companies_authenticated_members_only" ON public.companies;
DROP POLICY IF EXISTS "companies_superadmin_insert_only" ON public.companies;
DROP POLICY IF EXISTS "companies_owners_and_superadmin_update" ON public.companies;
DROP POLICY IF EXISTS "companies_superadmin_delete_only" ON public.companies;

-- Create optimized policies with cached auth function calls
CREATE POLICY "companies_authenticated_members_only" ON public.companies
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND 
  is_user_authorized_for_company(id)
);

CREATE POLICY "companies_superadmin_insert_only" ON public.companies
FOR INSERT WITH CHECK (
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

CREATE POLICY "companies_owners_and_superadmin_update" ON public.companies
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND 
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid()) 
    AND company_id = companies.id 
    AND role IN ('company_owner', 'superadmin') 
    AND is_active = true
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND 
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid()) 
    AND company_id = companies.id 
    AND role IN ('company_owner', 'superadmin') 
    AND is_active = true
  )
);

CREATE POLICY "companies_superadmin_delete_only" ON public.companies
FOR DELETE USING (
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

-- Add performance optimization comment
COMMENT ON TABLE public.companies IS 'Company information table with optimized RLS policies for performance at scale';