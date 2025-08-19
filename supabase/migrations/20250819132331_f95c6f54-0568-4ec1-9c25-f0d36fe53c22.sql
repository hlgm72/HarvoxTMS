-- Fix infinite recursion in user_company_roles RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "user_company_roles_select_policy" ON user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON user_company_roles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_has_company_access(user_id_param UUID, company_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = user_id_param 
    AND ucr.company_id = company_id_param
    AND ucr.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_is_company_admin(user_id_param UUID, company_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = user_id_param 
    AND ucr.company_id = company_id_param
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = user_id_param 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policies using security definer functions

-- Policy for SELECT: Users can view their own roles or roles in companies they have access to
CREATE POLICY "user_company_roles_select_safe" 
ON user_company_roles 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL AND 
  (
    user_id = auth.uid() OR
    user_has_company_access(auth.uid(), company_id)
  )
);

-- Policy for INSERT: Only company admins can create roles
CREATE POLICY "user_company_roles_insert_safe" 
ON user_company_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_is_company_admin(auth.uid(), company_id)
);

-- Policy for UPDATE: Company admins can update roles in their companies
CREATE POLICY "user_company_roles_update_safe" 
ON user_company_roles 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IS NOT NULL AND 
  user_is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_is_company_admin(auth.uid(), company_id)
);

-- Policy for DELETE: Only superadmins can delete roles
CREATE POLICY "user_company_roles_delete_safe" 
ON user_company_roles 
FOR DELETE 
TO authenticated 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role = 'superadmin'
  )
);