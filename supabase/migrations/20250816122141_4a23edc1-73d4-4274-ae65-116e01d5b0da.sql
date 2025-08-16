-- Fix security warnings: Set immutable search_path for security functions
-- This prevents potential schema hijacking attacks

-- Update can_access_sensitive_company_data function with immutable search_path
CREATE OR REPLACE FUNCTION can_access_sensitive_company_data(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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

-- Update log_sensitive_company_access function with immutable search_path
CREATE OR REPLACE FUNCTION log_sensitive_company_access(
  company_id_param UUID,
  access_type_param TEXT DEFAULT 'financial_view'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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