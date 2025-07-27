-- Fix Auth RLS Performance Issues and Remove Duplicate Policies

-- 1. Fix company_clients policy performance
DROP POLICY IF EXISTS "Company clients authenticated only" ON public.company_clients;
CREATE POLICY "Company clients authenticated only" 
ON public.company_clients 
FOR ALL 
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (company_id IN ( 
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (company_id IN ( 
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  ))
);

-- 2. Fix company_client_contacts policy performance  
DROP POLICY IF EXISTS "Company client contacts authenticated only" ON public.company_client_contacts;
CREATE POLICY "Company client contacts authenticated only" 
ON public.company_client_contacts 
FOR ALL 
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (client_id IN ( 
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (client_id IN ( 
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  ))
);

-- 3. Fix company_payment_periods policies - remove duplicates and optimize
DROP POLICY IF EXISTS "Company payment periods authenticated access" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;

CREATE POLICY "Company payment periods unified access" 
ON public.company_payment_periods 
FOR ALL 
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  ((company_id IN ( 
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )) OR (EXISTS ( 
    SELECT 1
    FROM user_company_roles
    WHERE user_company_roles.user_id = (SELECT auth.uid()) AND 
          user_company_roles.role = 'superadmin'::user_role AND 
          user_company_roles.is_active = true
  )))
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (company_id IN ( 
    SELECT get_user_admin_companies((SELECT auth.uid())) AS get_user_admin_companies
  ))
);

-- 4. Fix user_company_roles policies - remove all duplicates and create single optimized policy
DROP POLICY IF EXISTS "user_company_roles_authenticated_select" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_authenticated_update" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_authenticated_delete" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_basic_access" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON public.user_company_roles;

-- Create single unified policy for user_company_roles
CREATE POLICY "user_company_roles_unified_access" 
ON public.user_company_roles 
FOR ALL 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE)
);