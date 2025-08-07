-- Función para crear equipos con garantías ACID
CREATE OR REPLACE FUNCTION public.create_equipment_with_documents(
  equipment_data JSONB,
  documents_data JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_equipment_id UUID;
  equipment_result RECORD;
  document_record JSONB;
  created_documents JSONB := '[]'::jsonb;
  final_result JSONB;
BEGIN
  -- Validar autenticación
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar acceso a la empresa
  IF NOT (equipment_data->>'company_id')::UUID = ANY(get_user_company_ids()) THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  -- Crear el equipo
  INSERT INTO public.company_equipment (
    company_id,
    equipment_number,
    equipment_type,
    make,
    model,
    year,
    vin_number,
    license_plate,
    license_plate_expiry_date,
    registration_expiry_date,
    insurance_expiry_date,
    annual_inspection_expiry_date,
    fuel_type,
    status,
    current_mileage,
    purchase_date,
    purchase_price,
    notes,
    created_by
  ) VALUES (
    (equipment_data->>'company_id')::UUID,
    equipment_data->>'equipment_number',
    COALESCE(equipment_data->>'equipment_type', 'truck'),
    NULLIF(equipment_data->>'make', ''),
    NULLIF(equipment_data->>'model', ''),
    CASE WHEN equipment_data->>'year' IS NOT NULL AND equipment_data->>'year' != '' 
         THEN (equipment_data->>'year')::INTEGER 
         ELSE NULL END,
    NULLIF(equipment_data->>'vin_number', ''),
    NULLIF(equipment_data->>'license_plate', ''),
    NULLIF(equipment_data->>'license_plate_expiry_date', '')::DATE,
    NULLIF(equipment_data->>'registration_expiry_date', '')::DATE,
    NULLIF(equipment_data->>'insurance_expiry_date', '')::DATE,
    NULLIF(equipment_data->>'annual_inspection_expiry_date', '')::DATE,
    COALESCE(equipment_data->>'fuel_type', 'diesel'),
    COALESCE(equipment_data->>'status', 'active'),
    CASE WHEN equipment_data->>'current_mileage' IS NOT NULL AND equipment_data->>'current_mileage' != '' 
         THEN (equipment_data->>'current_mileage')::INTEGER 
         ELSE NULL END,
    NULLIF(equipment_data->>'purchase_date', '')::DATE,
    CASE WHEN equipment_data->>'purchase_price' IS NOT NULL AND equipment_data->>'purchase_price' != '' 
         THEN (equipment_data->>'purchase_price')::NUMERIC 
         ELSE NULL END,
    NULLIF(equipment_data->>'notes', ''),
    auth.uid()
  ) RETURNING * INTO equipment_result;

  new_equipment_id := equipment_result.id;

  -- Crear documentos si existen
  IF jsonb_array_length(documents_data) > 0 THEN
    FOR document_record IN SELECT * FROM jsonb_array_elements(documents_data)
    LOOP
      IF document_record->>'document_type' IS NOT NULL AND trim(document_record->>'document_type') != '' THEN
        INSERT INTO public.equipment_documents (
          equipment_id,
          document_type,
          document_name,
          file_url,
          file_name,
          file_size,
          content_type,
          expiry_date,
          issue_date,
          document_number,
          issuing_authority,
          uploaded_by
        ) VALUES (
          new_equipment_id,
          document_record->>'document_type',
          document_record->>'document_name',
          document_record->>'file_url',
          document_record->>'file_name',
          CASE WHEN document_record->>'file_size' IS NOT NULL 
               THEN (document_record->>'file_size')::INTEGER 
               ELSE NULL END,
          NULLIF(document_record->>'content_type', ''),
          NULLIF(document_record->>'expiry_date', '')::DATE,
          NULLIF(document_record->>'issue_date', '')::DATE,
          NULLIF(document_record->>'document_number', ''),
          NULLIF(document_record->>'issuing_authority', ''),
          auth.uid()
        );
        
        created_documents := created_documents || document_record;
      END IF;
    END LOOP;
  END IF;

  -- Preparar resultado final
  final_result := jsonb_build_object(
    'equipment', row_to_json(equipment_result),
    'documents_created', created_documents,
    'success', true,
    'message', 'Equipo creado exitosamente con ' || jsonb_array_length(created_documents) || ' documentos'
  );

  RETURN final_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creando equipo: %', SQLERRM;
END;
$$;

-- Función para crear cargas con garantías ACID
CREATE OR REPLACE FUNCTION public.create_load_with_stops_and_documents(
  load_data JSONB,
  stops_data JSONB DEFAULT '[]'::jsonb,
  documents_data JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_load_id UUID;
  load_result RECORD;
  stop_record JSONB;
  document_record JSONB;
  created_stops JSONB := '[]'::jsonb;
  created_documents JSONB := '[]'::jsonb;
  final_result JSONB;
  initial_status TEXT := 'created';
  user_company_id UUID;
BEGIN
  -- Validar autenticación
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener company_id del usuario
  SELECT company_id INTO user_company_id
  FROM user_company_roles 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;

  -- Determinar estado inicial
  IF load_data->>'driver_user_id' IS NOT NULL AND load_data->>'driver_user_id' != '' THEN
    initial_status := 'assigned';
  ELSIF jsonb_array_length(stops_data) >= 2 THEN
    initial_status := 'route_planned';
  END IF;

  -- Crear la carga
  INSERT INTO public.loads (
    load_number,
    po_number,
    driver_user_id,
    internal_dispatcher_id,
    client_id,
    client_contact_id,
    total_amount,
    commodity,
    weight_lbs,
    notes,
    customer_name,
    factoring_percentage,
    dispatching_percentage,
    leasing_percentage,
    status,
    created_by
  ) VALUES (
    load_data->>'load_number',
    NULLIF(load_data->>'po_number', ''),
    NULLIF(load_data->>'driver_user_id', '')::UUID,
    NULLIF(load_data->>'internal_dispatcher_id', '')::UUID,
    NULLIF(load_data->>'client_id', '')::UUID,
    NULLIF(load_data->>'client_contact_id', '')::UUID,
    (load_data->>'total_amount')::NUMERIC,
    NULLIF(load_data->>'commodity', ''),
    CASE WHEN load_data->>'weight_lbs' IS NOT NULL AND load_data->>'weight_lbs' != '' 
         THEN (load_data->>'weight_lbs')::INTEGER 
         ELSE NULL END,
    NULLIF(load_data->>'notes', ''),
    NULLIF(load_data->>'customer_name', ''),
    CASE WHEN load_data->>'factoring_percentage' IS NOT NULL AND load_data->>'factoring_percentage' != '' 
         THEN (load_data->>'factoring_percentage')::NUMERIC 
         ELSE NULL END,
    CASE WHEN load_data->>'dispatching_percentage' IS NOT NULL AND load_data->>'dispatching_percentage' != '' 
         THEN (load_data->>'dispatching_percentage')::NUMERIC 
         ELSE NULL END,
    CASE WHEN load_data->>'leasing_percentage' IS NOT NULL AND load_data->>'leasing_percentage' != '' 
         THEN (load_data->>'leasing_percentage')::NUMERIC 
         ELSE NULL END,
    initial_status,
    auth.uid()
  ) RETURNING * INTO load_result;

  new_load_id := load_result.id;

  -- Crear paradas si existen
  IF jsonb_array_length(stops_data) > 0 THEN
    FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data)
    LOOP
      INSERT INTO public.load_stops (
        load_id,
        stop_number,
        stop_type,
        company_name,
        address,
        city,
        state,
        zip_code,
        reference_number,
        contact_name,
        contact_phone,
        special_instructions,
        scheduled_date,
        actual_date
      ) VALUES (
        new_load_id,
        (stop_record->>'stop_number')::INTEGER,
        stop_record->>'stop_type',
        stop_record->>'company_name',
        NULLIF(stop_record->>'address', ''),
        NULLIF(stop_record->>'city', ''),
        NULLIF(stop_record->>'state', ''),
        NULLIF(stop_record->>'zip_code', ''),
        NULLIF(stop_record->>'reference_number', ''),
        NULLIF(stop_record->>'contact_name', ''),
        NULLIF(stop_record->>'contact_phone', ''),
        NULLIF(stop_record->>'special_instructions', ''),
        NULLIF(stop_record->>'scheduled_date', '')::DATE,
        NULLIF(stop_record->>'actual_date', '')::DATE
      );
      
      created_stops := created_stops || stop_record;
    END LOOP;
  END IF;

  -- Crear documentos si existen
  IF jsonb_array_length(documents_data) > 0 THEN
    FOR document_record IN SELECT * FROM jsonb_array_elements(documents_data)
    LOOP
      IF document_record->>'document_type' IS NOT NULL AND trim(document_record->>'document_type') != '' THEN
        INSERT INTO public.load_documents (
          load_id,
          document_type,
          file_name,
          file_url,
          file_size,
          content_type,
          uploaded_by
        ) VALUES (
          new_load_id,
          document_record->>'document_type',
          document_record->>'file_name',
          document_record->>'file_url',
          CASE WHEN document_record->>'file_size' IS NOT NULL 
               THEN (document_record->>'file_size')::INTEGER 
               ELSE NULL END,
          NULLIF(document_record->>'content_type', ''),
          auth.uid()
        );
        
        created_documents := created_documents || document_record;
      END IF;
    END LOOP;
  END IF;

  -- Preparar resultado final
  final_result := jsonb_build_object(
    'load', row_to_json(load_result),
    'stops_created', created_stops,
    'documents_created', created_documents,
    'success', true,
    'message', 'Carga creada exitosamente con ' || jsonb_array_length(created_stops) || ' paradas y ' || jsonb_array_length(created_documents) || ' documentos'
  );

  RETURN final_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creando carga: %', SQLERRM;
END;
$$;