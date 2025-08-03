-- Fix infinite recursion in RLS policies by using security definer functions
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view roles in their companies" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company admins can manage user roles" ON public.user_company_roles;

-- Create a security definer function to check user companies
CREATE OR REPLACE FUNCTION public.get_user_company_ids_safe(user_id_param uuid DEFAULT auth.uid())
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ARRAY_AGG(company_id)
  FROM public.user_company_roles
  WHERE user_id = user_id_param
    AND is_active = true;
$$;

-- Create a security definer function to check if user is admin in company
CREATE OR REPLACE FUNCTION public.is_user_admin_in_company_safe(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND role IN ('company_owner', 'operations_manager')
      AND is_active = true
  );
$$;

-- Create a security definer function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = user_id_param
      AND role = 'superadmin'
      AND is_active = true
  );
$$;

-- Create new RLS policies using security definer functions to avoid recursion
CREATE POLICY "Users can view roles in their companies" 
ON public.user_company_roles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND company_id = ANY(get_user_company_ids_safe(auth.uid()))
);

CREATE POLICY "Company admins can manage user roles" 
ON public.user_company_roles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    is_user_admin_in_company_safe(auth.uid(), company_id) 
    OR is_user_superadmin_safe(auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    is_user_admin_in_company_safe(auth.uid(), company_id) 
    OR is_user_superadmin_safe(auth.uid())
  )
);