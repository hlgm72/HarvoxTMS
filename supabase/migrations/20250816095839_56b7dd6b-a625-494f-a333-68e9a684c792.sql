-- Remove the SECURITY DEFINER functions that are causing the view warnings
-- since we're now handling access control at the application level

DROP FUNCTION IF EXISTS public.get_user_role_in_company(UUID);
DROP FUNCTION IF EXISTS public.can_access_company_financial_data(UUID);

-- The views are now simple and will inherit security from the underlying table RLS policies
-- Application-level security will control which view is used based on user roles