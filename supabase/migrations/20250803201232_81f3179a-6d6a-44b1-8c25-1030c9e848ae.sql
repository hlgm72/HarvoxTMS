-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "user_company_roles_unified_access" ON user_company_roles;

-- Create a new policy that allows users to see all company members
CREATE POLICY "Company users can view all roles in their company" 
ON user_company_roles 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE)
  AND (
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
    )
  )
);

-- Update insert policy to allow users to create roles in their company
CREATE POLICY "Company admins can insert roles" 
ON user_company_roles 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE)
  AND (
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);