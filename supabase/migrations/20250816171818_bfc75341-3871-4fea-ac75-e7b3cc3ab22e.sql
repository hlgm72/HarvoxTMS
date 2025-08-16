-- Update RLS policy for user_company_roles to allow company owners to assign roles
DROP POLICY IF EXISTS "user_company_roles_access_policy" ON public.user_company_roles;

CREATE POLICY "user_company_roles_comprehensive_access" ON public.user_company_roles
  FOR ALL 
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false 
    AND check_user_role_access(user_id, company_id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can manage their own roles
      user_id = auth.uid() 
      OR 
      -- Superadmins can manage any role
      check_is_superadmin()
      OR
      -- Company owners and operations managers can assign roles to users in their company
      (
        company_id IN (
          SELECT ucr.company_id 
          FROM user_company_roles ucr 
          WHERE ucr.user_id = auth.uid() 
          AND ucr.is_active = true 
          AND ucr.role IN ('company_owner', 'operations_manager')
        )
      )
    )
  );