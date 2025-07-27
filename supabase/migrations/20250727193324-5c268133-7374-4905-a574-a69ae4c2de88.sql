-- Phase 1: Fix the most critical business tables 
-- Focus on companies, company_client_contacts, company_clients, company_documents, company_drivers

-- 1. Companies - already updated but needs optimization
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.company_id = companies.id 
      AND ucr.role = 'company_owner'::user_role AND ucr.is_active = true
    )
  )
);

-- 2. Company client contacts - optimize
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- 3. Company clients - optimize
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- 4. Company documents - optimize
DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- 5. Company drivers - optimize
DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND (
    (SELECT auth.uid()) = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND (SELECT auth.uid()) = user_id
);