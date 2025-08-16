-- First, let's improve the companies table security by creating more restrictive policies
-- and ensuring sensitive financial data has additional protection

-- Drop existing policies that might be too permissive
DROP POLICY IF EXISTS "companies_secure_member_access" ON companies;

-- Create a more secure SELECT policy that ensures only company members can see their company data
-- and superadmins can see all companies
CREATE POLICY "companies_strict_member_access_only" 
ON companies 
FOR SELECT 
TO authenticated
USING (
  -- User must be authenticated and not anonymous
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User has an active role in this specific company
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
    OR
    -- OR user is a superadmin (verified through active role)
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )
  )
);

-- Create a function to safely check if user can access sensitive company financial data
-- Only company owners, operations managers, and superadmins should see sensitive fields
CREATE OR REPLACE FUNCTION can_access_sensitive_company_data(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_company_roles 
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

-- Log access to sensitive company data for audit purposes
CREATE OR REPLACE FUNCTION log_sensitive_company_access(
  company_id_param UUID,
  access_type_param TEXT DEFAULT 'financial_view'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    user_role,
    accessed_at
  )
  SELECT 
    company_id_param,
    auth.uid(),
    access_type_param,
    ucr.role,
    now()
  FROM user_company_roles ucr
  WHERE ucr.user_id = auth.uid()
  AND ucr.company_id = company_id_param
  AND ucr.is_active = true
  LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  -- Ignore logging errors to not break functionality
  NULL;
END;
$$;