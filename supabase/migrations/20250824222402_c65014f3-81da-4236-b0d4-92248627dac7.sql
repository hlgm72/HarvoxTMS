-- Fix security vulnerability in company_client_contacts table
-- Issue: Customer contact information could be accessed by unauthorized users

-- First, create a secure function to check if a user can access customer contacts
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "company_client_contacts_select" ON company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_insert" ON company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_update" ON company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_delete" ON company_client_contacts;

-- Create secure RLS policies for company_client_contacts
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

-- Add logging function for sensitive data access (optional security enhancement)
CREATE OR REPLACE FUNCTION public.log_customer_contact_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_company_id UUID;
BEGIN
  -- Get the company_id for the accessed client
  SELECT cc.company_id INTO client_company_id
  FROM company_clients cc
  WHERE cc.id = NEW.client_id;
  
  -- Log the access
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    accessed_at
  ) VALUES (
    client_company_id,
    auth.uid(),
    'customer_contact_access',
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to log access to customer contacts (for audit purposes)
DROP TRIGGER IF EXISTS log_customer_contact_access_trigger ON company_client_contacts;
CREATE TRIGGER log_customer_contact_access_trigger
  AFTER INSERT OR UPDATE ON company_client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_contact_access();