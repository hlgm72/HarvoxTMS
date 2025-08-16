-- Create the most restrictive companies policies to prevent anonymous access

-- Drop all existing policies on companies table
DROP POLICY IF EXISTS "companies_optimized_delete" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_select" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_update" ON public.companies;

-- Create ultra-secure companies policies with explicit role restrictions
CREATE POLICY "companies_secure_select" ON public.companies
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    ) OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin'::user_role 
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "companies_secure_insert" ON public.companies
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'superadmin'::user_role 
    AND ucr.is_active = true
  )
);

CREATE POLICY "companies_secure_update" ON public.companies
FOR UPDATE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = companies.id
    AND ucr.role IN ('company_owner'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
  )
) WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = companies.id
    AND ucr.role IN ('company_owner'::user_role, 'superadmin'::user_role)
    AND ucr.is_active = true
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
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'superadmin'::user_role 
    AND ucr.is_active = true
  )
);