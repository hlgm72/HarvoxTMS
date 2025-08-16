-- Optimize the security definer functions to use optimized auth calls

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
  current_user_id := (SELECT auth.uid());
  
  -- User can always see their own roles
  IF target_user_id = current_user_id THEN
    RETURN true;
  END IF;
  
  -- Check if current user is superadmin (direct query bypassing RLS)
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) INTO has_access;
  
  IF has_access THEN
    RETURN true;
  END IF;
  
  -- Check if current user is company admin in same company (direct query bypassing RLS)
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

CREATE OR REPLACE FUNCTION public.check_is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean := false;
BEGIN
  current_user_id := (SELECT auth.uid());
  
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;