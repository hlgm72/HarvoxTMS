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

-- Create audit logging function for customer contact access
CREATE OR REPLACE FUNCTION public.log_customer_contact_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_company_id uuid;
  user_role_name user_role;
BEGIN
  -- Get company_id from client
  SELECT cc.company_id INTO client_company_id
  FROM company_clients cc
  WHERE cc.id = COALESCE(NEW.client_id, OLD.client_id);
  
  -- Get user's role
  SELECT role INTO user_role_name
  FROM user_company_roles
  WHERE user_id = auth.uid()
  AND company_id = client_company_id
  AND is_active = true
  LIMIT 1;
  
  -- Log the access
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    user_role,
    accessed_at
  ) VALUES (
    client_company_id,
    auth.uid(),
    'customer_contact_information',
    user_role_name,
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
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

-- Create audit trigger for customer contact access
DROP TRIGGER IF EXISTS audit_customer_contact_access ON public.company_client_contacts;
CREATE TRIGGER audit_customer_contact_access
  AFTER SELECT ON public.company_client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_customer_contact_access();