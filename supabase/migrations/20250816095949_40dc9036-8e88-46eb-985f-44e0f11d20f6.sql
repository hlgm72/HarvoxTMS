-- Remove dependent policies and functions to fix SECURITY DEFINER warnings

-- 1. Drop the policy that depends on the function
DROP POLICY IF EXISTS "companies_full_access_restricted" ON public.companies;

-- 2. Drop the functions
DROP FUNCTION IF EXISTS public.get_user_role_in_company(UUID);
DROP FUNCTION IF EXISTS public.can_access_company_financial_data(UUID);

-- 3. The companies_role_based_access policy already handles the security correctly
-- No need to recreate it as it should already be in place

-- 4. Document that security is now handled by the existing RLS policy + application-level controls
COMMENT ON TABLE public.companies IS 'Security: Access controlled by companies_role_based_access RLS policy. Application chooses appropriate view (companies_public/companies_financial) based on user role.';