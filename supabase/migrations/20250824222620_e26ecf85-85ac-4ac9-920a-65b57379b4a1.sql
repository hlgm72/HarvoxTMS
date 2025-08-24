-- Fix security vulnerability in company_client_contacts table by completely recreating policies
-- Issue: Customer contact information could be accessed by unauthorized users

-- Step 1: Drop all existing policies first
DROP POLICY IF EXISTS "company_client_contacts_select" ON company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_insert" ON company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_update" ON company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_delete" ON company_client_contacts;

-- Step 2: Now drop the function
DROP FUNCTION IF EXISTS public.can_access_customer_contacts(uuid);

-- Step 3: Create a secure function to check if a user can access customer contacts
CREATE OR REPLACE FUNCTION public.can_access_customer_contacts(target_client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE cc.id = target_client_id
      AND ucr.user_id = auth.uid()
      AND ucr.is_active = true
      -- Only allow access to users with management roles, not drivers
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  );
$$;

-- Step 4: Create secure RLS policies for company_client_contacts
CREATE POLICY "Secure select customer contacts"
ON company_client_contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "Secure insert customer contacts"
ON company_client_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "Secure update customer contacts"
ON company_client_contacts
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "Secure delete customer contacts"
ON company_client_contacts
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);