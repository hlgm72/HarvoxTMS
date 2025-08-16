-- Fix anonymous access warning in companies table policies

-- Drop current companies policies
DROP POLICY IF EXISTS "companies_optimized_delete" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_select" ON public.companies;
DROP POLICY IF EXISTS "companies_optimized_update" ON public.companies;

-- Create secure companies policies that prevent anonymous access
CREATE POLICY "companies_optimized_select" ON public.companies
FOR SELECT USING (
  is_authenticated_non_anon_for_rls() AND
  (
    id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = get_current_user_for_rls() AND ucr.is_active = true
    ) OR 
    is_user_superadmin_safe(get_current_user_for_rls())
  )
);

CREATE POLICY "companies_optimized_insert" ON public.companies
FOR INSERT WITH CHECK (
  is_authenticated_non_anon_for_rls() AND
  is_user_superadmin_safe(get_current_user_for_rls())
);

CREATE POLICY "companies_optimized_update" ON public.companies
FOR UPDATE USING (
  is_authenticated_non_anon_for_rls() AND
  user_is_admin_in_company(get_current_user_for_rls(), id)
) WITH CHECK (
  is_authenticated_non_anon_for_rls() AND
  user_is_admin_in_company(get_current_user_for_rls(), id)
);

CREATE POLICY "companies_optimized_delete" ON public.companies
FOR DELETE USING (
  is_authenticated_non_anon_for_rls() AND
  is_user_superadmin_safe(get_current_user_for_rls())
);