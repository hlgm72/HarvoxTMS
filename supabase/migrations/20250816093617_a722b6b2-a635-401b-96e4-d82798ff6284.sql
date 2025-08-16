-- Fix auth function re-evaluation by wrapping in SELECT statements

-- Drop current policies
DROP POLICY IF EXISTS "companies_secure_delete" ON public.companies;
DROP POLICY IF EXISTS "companies_secure_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_secure_select" ON public.companies;
DROP POLICY IF EXISTS "companies_secure_update" ON public.companies;

-- Create optimized secure companies policies with SELECT-wrapped auth calls
CREATE POLICY "companies_secure_select" ON public.companies
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ) OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin'::user_role 
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "companies_secure_insert" ON public.companies
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role = 'superadmin'::user_role 
    AND ucr.is_active = true
  )
);

CREATE POLICY "companies_secure_update" ON public.companies
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.company_id = companies.id
    AND ucr.role IN ('company_owner'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.company_id = companies.id
    AND ucr.role IN ('company_owner'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
  )
);

CREATE POLICY "companies_secure_delete" ON public.companies
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role = 'superadmin'::user_role 
    AND ucr.is_active = true
  )
);