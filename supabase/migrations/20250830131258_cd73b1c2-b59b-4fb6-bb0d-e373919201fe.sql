CREATE OR REPLACE FUNCTION public.simple_load_operation(load_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  load_id UUID;
  stop_record RECORD;
  result JSONB;
  load_record RECORD;
BEGIN
  -- Obtener usuario actual
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extraer company_id de los datos (necesario para verificaciones de permisos)
  target_company_id := (load_data->>'company_id')::UUID;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Company ID requerido';
  END IF;

  -- Verificar permisos del usuario
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para crear/editar cargas en esta empresa';
  END IF;

  -- Verificar si es actualización o creación
  IF (load_data->>'id') IS NOT NULL THEN
    -- ACTUALIZACIÓN
    load_id := (load_data->>'id')::UUID;
    
    -- Verificar que la carga existe y el usuario tiene permisos (a través del driver)
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
      WHERE l.id = load_id AND ucr.company_id = target_company_id AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Carga no encontrada o sin permisos';
    END IF;

    -- Actualizar la carga
    UPDATE loads SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      driver_user_id = (load_data->>'driver_user_id')::UUID,
      internal_dispatcher_id = NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      client_id = NULLIF((load_data->>'client_id'), '')::UUID,
      client_contact_id = NULLIF((load_data->>'client_contact_id'), '')::UUID,
      total_amount = (load_data->>'total_amount')::NUMERIC,
      commodity = NULLIF(load_data->>'commodity', ''),
      weight_lbs = NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      notes = NULLIF(load_data->>'notes', ''),
      customer_name = NULLIF(load_data->>'customer_name', ''),
      factoring_percentage = NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      dispatching_percentage = NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      leasing_percentage = NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      updated_at = now()
    WHERE id = load_id;

    -- Eliminar stops existentes
    DELETE FROM load_stops WHERE load_id = load_id;

  ELSE
    -- CREACIÓN
    -- Verificar que el load_number no existe para drivers de la misma empresa
    IF EXISTS (
      SELECT 1 FROM loads l
      JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
      WHERE l.load_number = load_data->>'load_number'
      AND ucr.company_id = target_company_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'El número de carga % ya existe en esta empresa', load_data->>'load_number';
    END IF;

    -- Crear nueva carga
    INSERT INTO loads (
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
      (load_data->>'driver_user_id')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      NULLIF((load_data->>'client_id'), '')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      NULLIF(load_data->>'commodity', ''),
      NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      NULLIF(load_data->>'notes', ''),
      NULLIF(load_data->>'customer_name', ''),
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      'assigned',
      current_user_id
    ) RETURNING id INTO load_id;
  END IF;

  -- Crear/actualizar stops si están presentes
  IF load_data ? 'stops' AND jsonb_array_length(load_data->'stops') > 0 THEN
    FOR stop_record IN 
      SELECT * FROM jsonb_to_recordset(load_data->'stops') AS x(
        stop_number INTEGER,
        stop_type TEXT,
        company_name TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        reference_number TEXT,
        contact_name TEXT,
        contact_phone TEXT,
        special_instructions TEXT,
        scheduled_date TEXT,
        scheduled_time TEXT,
        actual_date TEXT
      )
    LOOP
      INSERT INTO load_stops (
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
        scheduled_time,
        actual_date
      ) VALUES (
        load_id,
        stop_record.stop_number,
        stop_record.stop_type,
        stop_record.company_name,
        stop_record.address,
        stop_record.city,
        stop_record.state,
        stop_record.zip_code,
        stop_record.reference_number,
        stop_record.contact_name,
        stop_record.contact_phone,
        stop_record.special_instructions,
        NULLIF(stop_record.scheduled_date, '')::DATE,
        NULLIF(stop_record.scheduled_time, '')::TIME,
        NULLIF(stop_record.actual_date, '')::DATE
      );
    END LOOP;
  END IF;

  -- Obtener y retornar la carga creada/actualizada
  SELECT * INTO load_record FROM loads WHERE id = load_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN (load_data->>'id') IS NOT NULL THEN 'Carga actualizada exitosamente'
      ELSE 'Carga creada exitosamente'
    END,
    'load', row_to_json(load_record),
    'load_id', load_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$function$