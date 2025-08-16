-- Fix critical security issue: Enable RLS on company data views
-- This prevents competitors from stealing sensitive business information

-- Enable RLS on companies_basic_info view
ALTER VIEW companies_basic_info SET (security_barrier = true);

-- Enable RLS on companies_financial_data view  
ALTER VIEW companies_financial_data SET (security_barrier = true);

-- Create RLS policies for companies_basic_info (accessible to all company members)
CREATE POLICY "companies_basic_info_company_members_only"
ON companies_basic_info
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
  )
);

-- Create RLS policies for companies_financial_data (restricted to owners and managers only)
CREATE POLICY "companies_financial_data_owners_managers_only"
ON companies_financial_data
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Create audit function to log sensitive data access
CREATE OR REPLACE FUNCTION log_sensitive_company_access(
  company_id_param UUID,
  access_type_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    user_role,
    accessed_at
  ) VALUES (
    company_id_param,
    auth.uid(),
    access_type_param,
    (
      SELECT role 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND company_id = company_id_param 
      AND is_active = true 
      LIMIT 1
    ),
    now()
  );
END;
$$;