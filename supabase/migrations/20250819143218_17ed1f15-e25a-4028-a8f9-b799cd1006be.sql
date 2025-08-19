-- Create the missing security function for company owner details access
CREATE OR REPLACE FUNCTION public.can_access_owner_details(company_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow access to company owners and superadmins
  -- This is stricter than the general sensitive data function
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'superadmin')  -- Removed 'operations_manager' for stricter access
    AND is_active = true
  );
END;
$$;

-- Test the function to ensure it works correctly
DO $$
BEGIN
  -- This should pass basic syntax validation
  PERFORM can_access_owner_details('00000000-0000-0000-0000-000000000000'::uuid);
  RAISE NOTICE 'Security function created successfully';
END;
$$;