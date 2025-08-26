-- Continue refactoring more Supabase functions with error codes

-- 3. Update create_or_update_client_with_validation function
CREATE OR REPLACE FUNCTION public.create_or_update_client_with_validation(client_data jsonb, client_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_client RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract company_id from client_data
  target_company_id := (client_data->>'company_id')::UUID;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COMPANY_ID_REQUIRED';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN client_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_CLIENTS';
  END IF;

  -- For UPDATE operations, validate client exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM company_clients cc
      JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
      WHERE cc.id = client_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'ERROR_CLIENT_NOT_FOUND';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(client_data->>'name', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_NAME_REQUIRED';
  END IF;

  -- Check for duplicate client names within company (exclude current client if updating)
  IF EXISTS (
    SELECT 1 FROM company_clients
    WHERE company_id = target_company_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(client_data->>'name'))
    AND (client_id IS NULL OR id != client_id)
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_CLIENT_NAME_EXISTS:name:%', client_data->>'name';
  END IF;

  -- Validate DOT number uniqueness if provided
  IF NULLIF(client_data->>'dot_number', '') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM company_clients
      WHERE company_id = target_company_id
      AND dot_number = client_data->>'dot_number'
      AND (client_id IS NULL OR id != client_id)
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'ERROR_DOT_NUMBER_EXISTS:number:%', client_data->>'dot_number';
    END IF;
  END IF;

  -- Validate MC number uniqueness if provided
  IF NULLIF(client_data->>'mc_number', '') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM company_clients
      WHERE company_id = target_company_id
      AND mc_number = client_data->>'mc_number'
      AND (client_id IS NULL OR id != client_id)
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'ERROR_MC_NUMBER_EXISTS:number:%', client_data->>'mc_number';
    END IF;
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE CLIENT
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO company_clients (
      company_id,
      name,
      alias,
      address,
      phone,
      email_domain,
      dot_number,
      mc_number,
      logo_url,
      notes,
      is_active
    ) VALUES (
      target_company_id,
      client_data->>'name',
      NULLIF(client_data->>'alias', ''),
      NULLIF(client_data->>'address', ''),
      NULLIF(client_data->>'phone', ''),
      NULLIF(client_data->>'email_domain', ''),
      NULLIF(client_data->>'dot_number', ''),
      NULLIF(client_data->>'mc_number', ''),
      NULLIF(client_data->>'logo_url', ''),
      NULLIF(client_data->>'notes', ''),
      COALESCE((client_data->>'is_active')::BOOLEAN, true)
    ) RETURNING * INTO result_client;
  ELSE
    UPDATE company_clients SET
      name = client_data->>'name',
      alias = NULLIF(client_data->>'alias', ''),
      address = NULLIF(client_data->>'address', ''),
      phone = NULLIF(client_data->>'phone', ''),
      email_domain = NULLIF(client_data->>'email_domain', ''),
      dot_number = NULLIF(client_data->>'dot_number', ''),
      mc_number = NULLIF(client_data->>'mc_number', ''),
      logo_url = NULLIF(client_data->>'logo_url', ''),
      notes = NULLIF(client_data->>'notes', ''),
      is_active = COALESCE((client_data->>'is_active')::BOOLEAN, is_active),
      updated_at = now()
    WHERE id = client_id
    RETURNING * INTO result_client;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Cliente creado exitosamente'
      ELSE 'Cliente actualizado exitosamente'
    END,
    'client', row_to_json(result_client),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;

-- 4. Update create_or_update_client_contact_with_validation function
CREATE OR REPLACE FUNCTION public.create_or_update_client_contact_with_validation(contact_data jsonb, contact_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_client_id UUID;
  target_company_id UUID;
  result_contact RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract client_id from contact_data
  target_client_id := (contact_data->>'client_id')::UUID;
  IF target_client_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_CLIENT_ID_REQUIRED';
  END IF;

  -- Get company_id from client
  SELECT company_id INTO target_company_id
  FROM company_clients
  WHERE id = target_client_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_CLIENT_NOT_FOUND';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN contact_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_CLIENT_CONTACTS';
  END IF;

  -- For UPDATE operations, validate contact exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM company_client_contacts ccc
      JOIN company_clients cc ON ccc.client_id = cc.id
      JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
      WHERE ccc.id = contact_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'ERROR_CONTACT_NOT_FOUND';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(contact_data->>'name', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_NAME_REQUIRED';
  END IF;

  -- Check for duplicate contact names within client (exclude current contact if updating)
  IF EXISTS (
    SELECT 1 FROM company_client_contacts
    WHERE client_id = target_client_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(contact_data->>'name'))
    AND (contact_id IS NULL OR id != contact_id)
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_CONTACT_NAME_EXISTS:name:%', contact_data->>'name';
  END IF;

  -- Validate email format if provided
  IF NULLIF(contact_data->>'email', '') IS NOT NULL THEN
    IF NOT (contact_data->>'email') ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'ERROR_EMAIL_FORMAT_INVALID';
    END IF;
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE CONTACT
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO company_client_contacts (
      client_id,
      name,
      email,
      phone_office,
      phone_mobile,
      extension,
      notes,
      is_active
    ) VALUES (
      target_client_id,
      contact_data->>'name',
      NULLIF(contact_data->>'email', ''),
      NULLIF(contact_data->>'phone_office', ''),
      NULLIF(contact_data->>'phone_mobile', ''),
      NULLIF(contact_data->>'extension', ''),
      NULLIF(contact_data->>'notes', ''),
      COALESCE((contact_data->>'is_active')::BOOLEAN, true)
    ) RETURNING * INTO result_contact;
  ELSE
    UPDATE company_client_contacts SET
      name = contact_data->>'name',
      email = NULLIF(contact_data->>'email', ''),
      phone_office = NULLIF(contact_data->>'phone_office', ''),
      phone_mobile = NULLIF(contact_data->>'phone_mobile', ''),
      extension = NULLIF(contact_data->>'extension', ''),
      notes = NULLIF(contact_data->>'notes', ''),
      is_active = COALESCE((contact_data->>'is_active')::BOOLEAN, is_active),
      updated_at = now()
    WHERE id = contact_id
    RETURNING * INTO result_contact;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Contacto creado exitosamente'
      ELSE 'Contacto actualizado exitosamente'
    END,
    'contact', row_to_json(result_contact),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;