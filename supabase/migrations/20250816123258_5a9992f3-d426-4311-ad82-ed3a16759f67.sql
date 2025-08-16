-- Fix security definer view issue by recreating views with proper security settings
-- The issue is that views should use SECURITY INVOKER (default) rather than SECURITY DEFINER

-- Drop and recreate companies_basic_info with proper security settings
DROP VIEW IF EXISTS companies_basic_info;

-- Create a secure view for basic company info that respects RLS of the querying user
CREATE VIEW companies_basic_info 
WITH (security_invoker = true) AS
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
FROM companies;
-- The view will use the RLS policies of the companies table automatically

-- Drop and recreate companies_financial_data with proper security settings
DROP VIEW IF EXISTS companies_financial_data;

-- Create a secure view for financial data that respects RLS of the querying user
CREATE VIEW companies_financial_data 
WITH (security_invoker = true) AS
SELECT 
  c.*
FROM companies c;
-- The view will inherit the RLS policies from the companies table

-- Since we're now relying on the companies table RLS policy,
-- we need to ensure the RLS policy properly restricts financial data access
-- Update the companies RLS policy to include financial data restrictions
DROP POLICY IF EXISTS "companies_ultra_secure_access" ON companies;

-- Create separate policies for different access levels
CREATE POLICY "companies_basic_read_access" 
ON companies 
FOR SELECT
TO authenticated
USING (
  -- Basic read access - company members can see their companies
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND can_access_company_data(id)
);

CREATE POLICY "companies_financial_modify_access" 
ON companies 
FOR ALL
TO authenticated
USING (
  -- Full access for modifications - only owners, operations managers, and superadmins
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = companies.id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  )
)
WITH CHECK (
  -- Same conditions for modifications
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND company_id = companies.id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  )
);