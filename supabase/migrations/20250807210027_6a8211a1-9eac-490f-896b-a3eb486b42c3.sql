-- ================================
-- CLIENT MANAGEMENT ACID FUNCTIONS
-- ================================

-- Function to create or update company clients with validation
CREATE OR REPLACE FUNCTION public.create_or_update_client_with_validation(
  client_data jsonb,
  client_id uuid DEFAULT NULL
)
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
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract company_id from client_data
  target_company_id := (client_data->>'company_id')::UUID;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id es requerido';
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
    RAISE EXCEPTION 'Sin permisos para gestionar clientes en esta empresa';
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
      RAISE EXCEPTION 'Cliente no encontrado o sin permisos para modificarlo';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(client_data->>'name', '') IS NULL THEN
    RAISE EXCEPTION 'name es requerido';
  END IF;

  -- Check for duplicate client names within company (exclude current client if updating)
  IF EXISTS (
    SELECT 1 FROM company_clients
    WHERE company_id = target_company_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(client_data->>'name'))
    AND (client_id IS NULL OR id != client_id)
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Ya existe un cliente activo con el nombre %', client_data->>'name';
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
      RAISE EXCEPTION 'Ya existe un cliente con el número DOT %', client_data->>'dot_number';
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
      RAISE EXCEPTION 'Ya existe un cliente con el número MC %', client_data->>'mc_number';
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
  RAISE EXCEPTION 'Error en operación ACID de cliente: %', SQLERRM;
END;
$function$;

-- Function to create or update client contacts with validation
CREATE OR REPLACE FUNCTION public.create_or_update_client_contact_with_validation(
  contact_data jsonb,
  contact_id uuid DEFAULT NULL
)
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
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract client_id from contact_data
  target_client_id := (contact_data->>'client_id')::UUID;
  IF target_client_id IS NULL THEN
    RAISE EXCEPTION 'client_id es requerido';
  END IF;

  -- Get company_id from client
  SELECT company_id INTO target_company_id
  FROM company_clients
  WHERE id = target_client_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado';
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
    RAISE EXCEPTION 'Sin permisos para gestionar contactos de clientes en esta empresa';
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
      RAISE EXCEPTION 'Contacto no encontrado o sin permisos para modificarlo';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(contact_data->>'name', '') IS NULL THEN
    RAISE EXCEPTION 'name es requerido';
  END IF;

  -- Check for duplicate contact names within client (exclude current contact if updating)
  IF EXISTS (
    SELECT 1 FROM company_client_contacts
    WHERE client_id = target_client_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(contact_data->>'name'))
    AND (contact_id IS NULL OR id != contact_id)
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Ya existe un contacto activo con el nombre % para este cliente', contact_data->>'name';
  END IF;

  -- Validate email format if provided
  IF NULLIF(contact_data->>'email', '') IS NOT NULL THEN
    IF NOT (contact_data->>'email') ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Formato de email inválido';
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
  RAISE EXCEPTION 'Error en operación ACID de contacto: %', SQLERRM;
END;
$function$;

-- Function to safely delete client with validation
CREATE OR REPLACE FUNCTION public.delete_client_with_validation(client_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  loads_count INTEGER;
  contacts_count INTEGER;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get company_id from client
  SELECT company_id INTO target_company_id
  FROM company_clients
  WHERE id = client_id_param AND is_active = true;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado o ya está inactivo';
  END IF;

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
    RAISE EXCEPTION 'Sin permisos para eliminar clientes en esta empresa';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Check for related loads (prevent deletion if loads exist)
  SELECT COUNT(*) INTO loads_count
  FROM loads
  WHERE client_id = client_id_param;

  IF loads_count > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar el cliente porque tiene % cargas asociadas. Desactívelo en su lugar.', loads_count;
  END IF;

  -- Count contacts for information
  SELECT COUNT(*) INTO contacts_count
  FROM company_client_contacts
  WHERE client_id = client_id_param AND is_active = true;

  -- ================================
  -- 3. SOFT DELETE CLIENT AND CONTACTS
  -- ================================
  
  -- Deactivate all contacts first
  UPDATE company_client_contacts
  SET is_active = false, updated_at = now()
  WHERE client_id = client_id_param AND is_active = true;

  -- Deactivate the client
  UPDATE company_clients
  SET is_active = false, updated_at = now()
  WHERE id = client_id_param;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cliente desactivado exitosamente',
    'client_id', client_id_param,
    'contacts_deactivated', contacts_count,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de cliente: %', SQLERRM;
END;
$function$;

-- Function to safely delete contact with validation  
CREATE OR REPLACE FUNCTION public.delete_client_contact_with_validation(contact_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  target_client_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get client_id and company_id from contact
  SELECT ccc.client_id, cc.company_id 
  INTO target_client_id, target_company_id
  FROM company_client_contacts ccc
  JOIN company_clients cc ON ccc.client_id = cc.id
  WHERE ccc.id = contact_id_param AND ccc.is_active = true;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Contacto no encontrado o ya está inactivo';
  END IF;

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
    RAISE EXCEPTION 'Sin permisos para eliminar contactos de clientes en esta empresa';
  END IF;

  -- ================================
  -- 2. SOFT DELETE CONTACT
  -- ================================
  
  UPDATE company_client_contacts
  SET is_active = false, updated_at = now()
  WHERE id = contact_id_param;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Contacto desactivado exitosamente',
    'contact_id', contact_id_param,
    'client_id', target_client_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de contacto: %', SQLERRM;
END;
$function$;