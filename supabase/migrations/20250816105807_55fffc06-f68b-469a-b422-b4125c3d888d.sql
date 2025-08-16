-- Fix the infinite recursion in user_company_roles policies by using SECURITY DEFINER functions

-- First, create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_can_access_role_record(target_user_id uuid, target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    -- User can see their own roles
    target_user_id = auth.uid()
    -- OR user is a superadmin (check directly without recursion)
    OR EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
      LIMIT 1
    )
    -- OR user is company admin in same company
    OR EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = target_company_id
      AND ucr.role IN ('company_owner', 'operations_manager')
      AND ucr.is_active = true
      LIMIT 1
    );
$$;

-- Create a simple function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.user_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
    LIMIT 1
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "user_company_roles_relaxed_access" ON public.user_company_roles;

-- Create a simple, non-recursive policy
CREATE POLICY "user_company_roles_secure_access" 
ON public.user_company_roles 
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User can see their own roles
    user_id = auth.uid()
    -- OR use security definer function to check broader access
    OR user_can_access_role_record(user_id, company_id)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- Can only insert/update their own roles or if superadmin
    user_id = auth.uid() OR user_is_superadmin()
  )
);