-- Fix RLS policies for user_company_roles to allow company owners to manage roles

-- Drop existing policy that might be too restrictive
DROP POLICY IF EXISTS "user_company_roles_comprehensive_access" ON user_company_roles;

-- Create separate policies for different operations

-- Policy for SELECT: Users can view roles in their companies
CREATE POLICY "user_company_roles_select_policy" 
ON user_company_roles 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL AND 
  (
    -- Users can see their own roles
    user_id = auth.uid() OR
    -- Users can see roles in companies where they have access
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- Policy for INSERT: Only company owners and superadmins can create roles
CREATE POLICY "user_company_roles_insert_policy" 
ON user_company_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'superadmin')
  )
);

-- Policy for UPDATE: Company owners and superadmins can update roles in their companies
CREATE POLICY "user_company_roles_update_policy" 
ON user_company_roles 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IS NOT NULL AND 
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'superadmin')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'superadmin')
  )
);

-- Policy for DELETE: Only superadmins can delete roles (soft delete via UPDATE should be used instead)
CREATE POLICY "user_company_roles_delete_policy" 
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