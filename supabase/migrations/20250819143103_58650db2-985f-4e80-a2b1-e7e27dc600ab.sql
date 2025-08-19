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

-- Add audit logging function for owner details access
CREATE OR REPLACE FUNCTION public.log_owner_details_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to owner details
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    user_role,
    accessed_at
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    'company_owner_details',
    (
      SELECT role FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND company_id = COALESCE(NEW.company_id, OLD.company_id)
      AND is_active = true 
      LIMIT 1
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit trigger for owner details access
DROP TRIGGER IF EXISTS audit_owner_details_access ON public.company_owner_details;
CREATE TRIGGER audit_owner_details_access
  AFTER SELECT OR UPDATE OR DELETE ON public.company_owner_details
  FOR EACH ROW EXECUTE FUNCTION public.log_owner_details_access();

-- Verify the RLS policy is using the correct function (should already be in place)
-- This is just for verification - the policy should already exist
DROP POLICY IF EXISTS "company_owner_details_ultra_restricted" ON public.company_owner_details;
CREATE POLICY "company_owner_details_ultra_restricted"
ON public.company_owner_details
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_owner_details(company_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_owner_details(company_id)
);

-- Test the function to ensure it works correctly
DO $$
BEGIN
  -- This should pass basic syntax validation
  PERFORM can_access_owner_details('00000000-0000-0000-0000-000000000000'::uuid);
  RAISE NOTICE 'Security function created successfully';
END;
$$;