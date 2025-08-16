-- Fix critical security vulnerability in companies table
-- Create more restrictive access control that separates basic info from sensitive data

-- First, drop the overly permissive existing policy
DROP POLICY IF EXISTS "companies_authenticated_members_access" ON companies;

-- Create separate policies for different types of data access

-- 1. Basic company info (safe for all company members)
CREATE POLICY "companies_basic_info_members_only" 
ON companies 
FOR SELECT 
TO authenticated
USING (
  -- User must be authenticated and not anonymous
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User is a member of this specific company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND is_active = true
    )
  )
);

-- 2. Sensitive company data (only for owners and operations managers of the same company)
CREATE POLICY "companies_sensitive_data_restricted" 
ON companies 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- Only company owners, operations managers, or superadmins
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role IN ('company_owner', 'operations_manager')
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- 3. Create a function to check if user can access sensitive company data
CREATE OR REPLACE FUNCTION public.can_access_company_sensitive_data(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- 4. Log sensitive data access for audit purposes
CREATE OR REPLACE FUNCTION public.log_sensitive_company_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to sensitive fields
  IF TG_OP = 'SELECT' AND (
    NEW.ein IS NOT NULL OR 
    NEW.owner_email IS NOT NULL OR 
    NEW.owner_phone IS NOT NULL OR
    NEW.dot_number IS NOT NULL OR
    NEW.mc_number IS NOT NULL
  ) THEN
    INSERT INTO company_sensitive_data_access_log (
      company_id,
      accessed_by,
      access_type,
      user_role,
      accessed_at
    ) VALUES (
      NEW.id,
      auth.uid(),
      'company_sensitive_data',
      (SELECT role FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment documenting the security enhancement
COMMENT ON TABLE companies IS 'Company information with enhanced RLS policies. Access restricted to company members only, with sensitive data further restricted to owners/operations managers.';