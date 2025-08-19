-- Create secure access function for customer contact information
CREATE OR REPLACE FUNCTION public.can_access_customer_contacts(client_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_company_id uuid;
BEGIN
  -- Get the company_id for this client
  SELECT company_id INTO client_company_id
  FROM company_clients
  WHERE id = client_id_param;
  
  IF client_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Only allow access to users with customer-facing roles:
  -- company_owner, operations_manager, dispatcher, multi_company_dispatcher, superadmin
  -- Drivers should NOT have access to customer contact information
  RETURN EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = client_company_id
    AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'multi_company_dispatcher', 'superadmin')
    AND is_active = true
  );
END;
$$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "company_client_contacts_final" ON public.company_client_contacts;

-- Create new restrictive policies
CREATE POLICY "customer_contacts_select_authorized_only"
ON public.company_client_contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "customer_contacts_insert_authorized_only"
ON public.company_client_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "customer_contacts_update_authorized_only"
ON public.company_client_contacts
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

CREATE POLICY "customer_contacts_delete_authorized_only"
ON public.company_client_contacts
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);