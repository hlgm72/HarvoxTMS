-- Final RLS performance optimization - fix remaining issues

-- 1. Fix companies table policies - optimize auth function calls
DROP POLICY IF EXISTS "companies_optimized_delete" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_select" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_update" ON public.companies;

-- Create optimized companies policies with proper auth function calls
CREATE POLICY "companies_optimized_select" ON public.companies
FOR SELECT USING (
  current_setting('app.service_operation', true) = 'allowed'
  OR (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    (
      id IN (
        SELECT ucr.company_id FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
      ) OR 
      is_user_superadmin_safe((SELECT auth.uid()))
    )
  )
);

CREATE POLICY "companies_optimized_insert" ON public.companies
FOR INSERT WITH CHECK (
  current_setting('app.service_operation', true) = 'allowed'
  OR (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "companies_optimized_update" ON public.companies
FOR UPDATE USING (
  current_setting('app.service_operation', true) = 'allowed'
  OR (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    user_is_admin_in_company((SELECT auth.uid()), id)
  )
) WITH CHECK (
  current_setting('app.service_operation', true) = 'allowed'
  OR (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    user_is_admin_in_company((SELECT auth.uid()), id)
  )
);

CREATE POLICY "companies_optimized_delete" ON public.companies
FOR DELETE USING (
  current_setting('app.service_operation', true) = 'allowed'
  OR (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
    is_user_superadmin_safe((SELECT auth.uid()))
  )
);

-- 2. Fix loads_archive table - remove duplicate policies
DROP POLICY IF EXISTS "loads_archive_optimized_view" ON public.loads_archive;
DROP POLICY IF EXISTS "loads_archive_optimized_manage" ON public.loads_archive;
DROP POLICY IF EXISTS "loads_archive_unified" ON public.loads_archive;

-- Create single unified policy for loads_archive
CREATE POLICY "loads_archive_final" ON public.loads_archive
FOR ALL USING (
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_user_superadmin_safe((SELECT auth.uid()))
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_user_superadmin_safe((SELECT auth.uid()))
);

-- 3. Fix profiles table - remove old duplicate policies
DROP POLICY IF EXISTS "Users and company admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and company admins can update profiles" ON public.profiles;

-- 4. Fix security_audit_log table - remove old duplicate policy
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;