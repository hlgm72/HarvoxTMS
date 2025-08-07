-- Crear función para manejo transaccional de creación de clientes
CREATE OR REPLACE FUNCTION public.create_client_with_contacts(
  client_data JSONB,
  contacts_data JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_client_id UUID;
  client_result RECORD;
  contact_record JSONB;
  created_contacts JSONB := '[]'::jsonb;
  final_result JSONB;
BEGIN
  -- Validar que el usuario esté autenticado
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que el usuario tenga acceso a la empresa
  IF NOT (client_data->>'company_id')::UUID = ANY(get_user_company_ids()) THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  -- Iniciar transacción implícita (función es atómica por defecto)
  
  -- 1. Crear el cliente
  INSERT INTO public.company_clients (
    company_id,
    name,
    alias,
    phone,
    dot_number,
    mc_number,
    address,
    email_domain,
    logo_url,
    notes,
    is_active
  ) VALUES (
    (client_data->>'company_id')::UUID,
    client_data->>'name',
    NULLIF(client_data->>'alias', ''),
    NULLIF(client_data->>'phone', ''),
    NULLIF(client_data->>'dot_number', ''),
    NULLIF(client_data->>'mc_number', ''),
    NULLIF(client_data->>'address', ''),
    NULLIF(client_data->>'email_domain', ''),
    NULLIF(client_data->>'logo_url', ''),
    NULLIF(client_data->>'notes', ''),
    COALESCE((client_data->>'is_active')::boolean, true)
  ) RETURNING * INTO client_result;

  new_client_id := client_result.id;

  -- 2. Crear contactos si existen
  IF jsonb_array_length(contacts_data) > 0 THEN
    FOR contact_record IN SELECT * FROM jsonb_array_elements(contacts_data)
    LOOP
      -- Solo crear contactos que tengan nombre
      IF contact_record->>'name' IS NOT NULL AND trim(contact_record->>'name') != '' THEN
        INSERT INTO public.company_client_contacts (
          client_id,
          name,
          email,
          phone_office,
          phone_mobile,
          extension,
          notes,
          is_active
        ) VALUES (
          new_client_id,
          contact_record->>'name',
          NULLIF(contact_record->>'email', ''),
          NULLIF(contact_record->>'phone_office', ''),
          NULLIF(contact_record->>'phone_mobile', ''),
          NULLIF(contact_record->>'extension', ''),
          NULLIF(contact_record->>'notes', ''),
          true
        );
        
        -- Agregar contacto creado al resultado
        created_contacts := created_contacts || contact_record;
      END IF;
    END LOOP;
  END IF;

  -- Preparar resultado final
  final_result := jsonb_build_object(
    'client', row_to_json(client_result),
    'contacts_created', created_contacts,
    'success', true,
    'message', 'Cliente creado exitosamente con ' || jsonb_array_length(created_contacts) || ' contactos'
  );

  RETURN final_result;

EXCEPTION WHEN OTHERS THEN
  -- El rollback es automático en funciones PL/pgSQL
  RAISE EXCEPTION 'Error creando cliente: %', SQLERRM;
END;
$$;

-- Crear función para actualización transaccional de clientes
CREATE OR REPLACE FUNCTION public.update_client_with_logo_download(
  client_id_param UUID,
  client_data JSONB,
  external_logo_url TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_client RECORD;
  final_logo_url TEXT;
  download_result JSONB;
BEGIN
  -- Validar que el usuario esté autenticado
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar que el cliente existe y el usuario tiene acceso
  IF NOT EXISTS (
    SELECT 1 FROM public.company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE cc.id = client_id_param 
    AND ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Cliente no encontrado o sin permisos';
  END IF;

  -- 1. Actualizar cliente con datos básicos (sin logo final todavía)
  UPDATE public.company_clients SET
    name = client_data->>'name',
    alias = NULLIF(client_data->>'alias', ''),
    phone = NULLIF(client_data->>'phone', ''),
    dot_number = NULLIF(client_data->>'dot_number', ''),
    mc_number = NULLIF(client_data->>'mc_number', ''),
    address = NULLIF(client_data->>'address', ''),
    email_domain = NULLIF(client_data->>'email_domain', ''),
    logo_url = COALESCE(NULLIF(client_data->>'logo_url', ''), logo_url), -- Mantener logo actual si no hay nuevo
    notes = NULLIF(client_data->>'notes', ''),
    is_active = COALESCE((client_data->>'is_active')::boolean, is_active),
    updated_at = now()
  WHERE id = client_id_param
  RETURNING * INTO updated_client;

  -- Preparar resultado
  download_result := jsonb_build_object(
    'client', row_to_json(updated_client),
    'logo_download_needed', external_logo_url IS NOT NULL AND 
                           external_logo_url != '' AND
                           external_logo_url NOT LIKE '%supabase.co%' AND
                           external_logo_url NOT LIKE '%client-logos%',
    'external_logo_url', external_logo_url,
    'success', true,
    'message', 'Cliente actualizado exitosamente'
  );

  RETURN download_result;

EXCEPTION WHEN OTHERS THEN
  -- El rollback es automático en funciones PL/pgSQL
  RAISE EXCEPTION 'Error actualizando cliente: %', SQLERRM;
END;
$$;