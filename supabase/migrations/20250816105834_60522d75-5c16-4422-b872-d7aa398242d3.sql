-- Fix the recursion completely by disabling RLS temporarily in the security definer functions

-- Drop the existing functions and policy
DROP FUNCTION IF EXISTS public.user_can_access_role_record(uuid, uuid);
DROP FUNCTION IF EXISTS public.user_is_superadmin();
DROP POLICY IF EXISTS "user_company_roles_secure_access" ON public.user_company_roles;

-- Create security definer functions that bypass RLS
CREATE OR REPLACE FUNCTION public.check_user_role_access(target_user_id uuid, target_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  has_access boolean := false;
BEGIN
  current_user_id := auth.uid();
  
  -- User can always see their own roles
  IF target_user_id = current_user_id THEN
    RETURN true;
  END IF;
  
  -- Check if current user is superadmin (direct query without RLS)
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) INTO has_access;
  
  IF has_access THEN
    RETURN true;
  END IF;
  
  -- Check if current user is company admin in same company (direct query without RLS)
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager')
    AND is_active = true
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- Create simple superadmin check
CREATE OR REPLACE FUNCTION public.check_is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Create a much simpler policy
CREATE POLICY "user_company_roles_access_policy" 
ON public.user_company_roles 
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND check_user_role_access(user_id, company_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (user_id = auth.uid() OR check_is_superadmin())
);