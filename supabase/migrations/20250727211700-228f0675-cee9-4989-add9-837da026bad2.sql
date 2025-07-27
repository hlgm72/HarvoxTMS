-- First, drop ALL existing policies on user_company_roles to start clean
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can view their company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Admins can view company roles" ON public.user_company_roles;

-- Also drop any other existing policies that might cause conflicts
DROP POLICY IF EXISTS "User company roles complete policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Role management policy" ON public.user_company_roles;