-- Fix RLS performance issues: optimize auth function calls to prevent re-evaluation per row
-- Replace auth.uid() and auth.jwt() with (select auth.uid()) and (select auth.jwt())

-- Drop existing policies
DROP POLICY IF EXISTS "Secure select customer contacts" ON company_client_contacts;
DROP POLICY IF EXISTS "Secure insert customer contacts" ON company_client_contacts;
DROP POLICY IF EXISTS "Secure update customer contacts" ON company_client_contacts;
DROP POLICY IF EXISTS "Secure delete customer contacts" ON company_client_contacts;

-- Create optimized RLS policies for company_client_contacts
CREATE POLICY "Secure select customer contacts"
ON company_client_contacts
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "Secure insert customer contacts"
ON company_client_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "Secure update customer contacts"
ON company_client_contacts
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "Secure delete customer contacts"
ON company_client_contacts
FOR DELETE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);