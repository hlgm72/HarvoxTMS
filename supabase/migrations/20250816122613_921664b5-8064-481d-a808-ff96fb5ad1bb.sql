-- Fix the trigger syntax and implement comprehensive security for companies table

-- First, let's add a security definer function to more strictly validate company access
CREATE OR REPLACE FUNCTION can_access_company_data(company_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN company_id_param IS NULL THEN
      -- For listing companies, user must be authenticated and have any active company role
      EXISTS (
        SELECT 1 FROM user_company_roles 
        WHERE user_id = (SELECT auth.uid()) 
        AND is_active = true
      )
    ELSE
      -- For specific company access, user must be member of that company or superadmin
      EXISTS (
        SELECT 1 FROM user_company_roles 
        WHERE user_id = (SELECT auth.uid())
        AND (company_id = company_id_param OR role = 'superadmin')
        AND is_active = true
      )
  END;
$$;

-- Create a view that only exposes basic company information (non-sensitive data)
-- This separates sensitive financial data from basic company info
CREATE OR REPLACE VIEW companies_basic_info AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  logo_url,
  plan_type,
  status,
  created_at,
  updated_at
FROM companies
WHERE can_access_company_data(id);

-- Create a restricted view for sensitive financial data
-- Only accessible by company owners, operations managers, and superadmins
CREATE OR REPLACE VIEW companies_financial_data AS
SELECT 
  c.*
FROM companies c
WHERE EXISTS (
  SELECT 1 FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid())
  AND ucr.company_id = c.id
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true
);

-- Update the main companies table RLS policy to be even more restrictive
DROP POLICY IF EXISTS "companies_strict_member_access_only" ON companies;

-- Create the most restrictive policy possible
CREATE POLICY "companies_ultra_secure_access" 
ON companies 
FOR ALL
TO authenticated
USING (
  -- Must be authenticated, non-anonymous, and have explicit company access
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND can_access_company_data(id)
)
WITH CHECK (
  -- Same conditions for modifications
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND can_access_company_data(id)
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = companies.id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  )
);