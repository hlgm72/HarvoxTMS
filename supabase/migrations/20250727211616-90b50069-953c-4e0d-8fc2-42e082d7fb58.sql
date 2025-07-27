-- Fix infinite recursion in user_company_roles policies using SECURITY DEFINER functions

-- First, create a function to check if user has specific role in any company
CREATE OR REPLACE FUNCTION public.user_has_role_in_company(user_id_param uuid, company_id_param uuid, role_param user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND role = role_param
      AND is_active = true
  );
$$;

-- Function to check if user is company owner or superadmin in any company
CREATE OR REPLACE FUNCTION public.user_is_admin_in_company(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
  );
$$;

-- Function to get user's companies where they are admin
CREATE OR REPLACE FUNCTION public.get_user_admin_companies(user_id_param uuid)
RETURNS TABLE(company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ucr.company_id
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = user_id_param
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin');
$$;

-- Now drop and recreate the policies without recursion
DROP POLICY IF EXISTS "Users can view their company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;

-- Simple policy for users to see their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_company_roles 
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

-- Policy for admins to see roles in their companies
CREATE POLICY "Admins can view company roles" 
ON public.user_company_roles 
FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM get_user_admin_companies((select auth.uid()))
  )
);

-- Policy for company owners to manage roles
CREATE POLICY "Company owners can manage roles" 
ON public.user_company_roles 
FOR ALL TO authenticated
USING (
  user_is_admin_in_company((select auth.uid()), company_id)
)
WITH CHECK (
  user_is_admin_in_company((select auth.uid()), company_id)
);