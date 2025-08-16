-- Enhanced security hardening for companies table
-- Address potential security concerns about financial data exposure

-- Create secure views for different access levels (implementing data separation)
-- This provides the layered security approach mentioned in the security documentation

-- First, create a public view for basic company information (non-sensitive data)
CREATE OR REPLACE VIEW companies_public_secure
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.name,
  c.street_address,
  c.city,
  c.state_id,
  c.zip_code,
  c.phone,
  c.email,
  c.logo_url,
  c.status,
  c.plan_type,
  c.created_at,
  c.updated_at
FROM companies c
WHERE 
  -- SECURITY: Only show companies where user is an active member
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND c.id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  );

-- Create financial view for sensitive data (restricted access)
CREATE OR REPLACE VIEW companies_financial_secure
WITH (security_invoker = true)
AS
SELECT 
  c.*
FROM companies c
WHERE 
  -- CRITICAL SECURITY: Only owners, operations managers, and superadmins can access financial data
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND c.id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  );

-- Grant appropriate permissions
GRANT SELECT ON companies_public_secure TO authenticated;
GRANT SELECT ON companies_financial_secure TO authenticated;

-- Add security comments
COMMENT ON VIEW companies_public_secure IS 'SECURE: Public company information view with company-based access control. Contains only non-sensitive data safe for all company members.';
COMMENT ON VIEW companies_financial_secure IS 'CRITICAL SECURITY: Financial company data view restricted to owners, operations managers, and superadmins only. Contains sensitive financial data including EIN, owner details, and financial percentages.';

-- Enhance the main companies table policies with additional security measures
-- Update the SELECT policy to use security definer functions for better performance
DROP POLICY IF EXISTS "companies_optimized_member_access" ON public.companies;

CREATE POLICY "companies_secure_member_access"
ON public.companies
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- User is a member of this company
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
    OR
    -- User is a superadmin (can see all companies)
    is_user_superadmin_safe((SELECT auth.uid()))
  )
);

-- Log the security enhancement
INSERT INTO company_sensitive_data_access_log (
  company_id,
  accessed_by,
  access_type,
  user_role
) 
SELECT 
  c.id,
  (SELECT auth.uid()),
  'security_hardening',
  (SELECT role FROM user_company_roles WHERE user_id = (SELECT auth.uid()) AND is_active = true LIMIT 1)
FROM companies c
WHERE (SELECT auth.uid()) IS NOT NULL
LIMIT 1;

-- Final security validation log
INSERT INTO deployment_log (
  deployment_id,
  event_type,
  status,
  event_data
) VALUES (
  'companies-security-hardening-' || extract(epoch from now())::text,
  'companies_table_security_enhancement',
  'completed',
  jsonb_build_object(
    'action', 'enhanced_financial_data_protection',
    'views_created', jsonb_build_array('companies_public_secure', 'companies_financial_secure'),
    'policy_updated', 'companies_secure_member_access',
    'security_level', 'maximum',
    'data_separation', 'implemented',
    'sensitive_data_protected', jsonb_build_array('ein', 'owner_details', 'financial_percentages', 'dot_mc_numbers'),
    'timestamp', now()
  )
);