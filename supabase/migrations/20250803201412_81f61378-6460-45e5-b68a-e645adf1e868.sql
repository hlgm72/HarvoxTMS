-- Drop the problematic policy first
DROP POLICY IF EXISTS "Company users can view all roles in their company" ON user_company_roles;
DROP POLICY IF EXISTS "Company admins can insert roles" ON user_company_roles;

-- Create a security definer function to get user companies (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_company_ids(user_id_param uuid DEFAULT auth.uid())
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

-- Create a safe SELECT policy using the security definer function
CREATE POLICY "Company users can view all roles in their company" 
ON user_company_roles 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE)
  AND (
    company_id = ANY(public.get_user_company_ids())
  )
);

-- Create a safe INSERT policy for company admins
CREATE POLICY "Company admins can insert roles" 
ON user_company_roles 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE)
  AND (
    company_id = ANY(public.get_user_company_ids())
  )
  AND (
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = (SELECT auth.uid())
        AND company_id = user_company_roles.company_id
        AND role IN ('company_owner', 'operations_manager', 'superadmin')
        AND is_active = true
    )
  )
);