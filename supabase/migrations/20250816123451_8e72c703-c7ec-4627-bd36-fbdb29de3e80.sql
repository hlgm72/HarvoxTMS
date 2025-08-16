-- Fix performance warning: Consolidate overlapping SELECT policies
-- The issue is that both policies apply to SELECT operations

-- Drop the overlapping policies
DROP POLICY IF EXISTS "companies_basic_read_access" ON companies;
DROP POLICY IF EXISTS "companies_financial_modify_access" ON companies;

-- Create a single comprehensive policy that handles all operations efficiently
CREATE POLICY "companies_comprehensive_access" 
ON companies 
FOR ALL
TO authenticated
USING (
  -- Basic read access - company members can see their companies
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND can_access_company_data(id)
)
WITH CHECK (
  -- Modification access - only owners, operations managers, and superadmins
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