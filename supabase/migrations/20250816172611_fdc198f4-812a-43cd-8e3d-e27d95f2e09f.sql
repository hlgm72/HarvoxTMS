-- Create security definer function to check if user can manage company roles
CREATE OR REPLACE FUNCTION public.can_manage_company_roles(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = target_company_id
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  );
$$;

-- Recreate the RLS policy using the security definer function
DROP POLICY IF EXISTS "user_company_roles_comprehensive_access" ON public.user_company_roles;

CREATE POLICY "user_company_roles_comprehensive_access" ON public.user_company_roles
  FOR ALL 
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
    AND check_user_role_access(user_id, company_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can manage their own roles
      user_id = (SELECT auth.uid()) 
      OR 
      -- Superadmins can manage any role
      check_is_superadmin()
      OR
      -- Company owners and operations managers can assign roles to users in their company
      can_manage_company_roles(company_id)
    )
  );