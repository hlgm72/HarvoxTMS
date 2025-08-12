-- Fix the create_or_update_load_with_validation function
-- The loads table doesn't have a company_id column, we need to get it from user_company_roles

CREATE OR REPLACE FUNCTION public.create_or_update_load_with_validation(
  load_data jsonb,
  stops_data jsonb,
  mode text DEFAULT 'create'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load RECORD;
  result_stops jsonb := '[]'::jsonb;
  stop_record jsonb;
  operation_type TEXT;
  existing_load_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get company_id from user_company_roles
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = current_user_id AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no tiene empresa asignada';
  END IF;

  -- Determine operation type and validate load_id
  operation_type := mode;
  existing_load_id := (load_data->>'id')::UUID;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar cargas en esta empresa';
  END IF;

  -- For edit mode, validate the load exists and belongs to user's company
  -- Since loads doesn't have company_id, we check through the created_by field or driver assignment
  IF operation_type = 'edit' AND existing_load_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = existing_load_id
      AND (
        l.created_by = current_user_id OR
        EXISTS (
          SELECT 1 FROM user_company_roles ucr 
          WHERE ucr.user_id = current_user_id 
          AND ucr.company_id = target_company_id
          AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
          AND ucr.is_active = true
        )
      )
    ) THEN
      RAISE EXCEPTION 'Carga no encontrada o sin permisos para modificarla';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(load_data->>'load_number', '') IS NULL THEN
    RAISE EXCEPTION 'load_number es requerido';
  END IF;

  IF NULLIF(load_data->>'client_id', '') IS NULL THEN
    RAISE EXCEPTION 'client_id es requerido';
  END IF;

  -- Check for duplicate load numbers within company loads created by users from the same company
  -- Since loads doesn't have company_id, we check through created_by user's company
  IF EXISTS (
    SELECT 1 FROM loads l
    JOIN user_company_roles ucr ON l.created_by = ucr.user_id
    WHERE ucr.company_id = target_company_id
    AND l.load_number = load_data->>'load_number'
    AND (operation_type = 'create' OR l.id != existing_load_id)
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Ya existe una carga con el número %', load_data->>'load_number';
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE LOAD
  -- ================================
  
  IF operation_type = 'create' THEN
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
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      (load_data->>'client_id')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      COALESCE((load_data->>'total_amount')::NUMERIC, 0),
      NULLIF(load_data->>'commodity', ''),
      NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      NULLIF(load_data->>'notes', ''),
      NULLIF(load_data->>'customer_name', ''),
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      'created',
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      driver_user_id = NULLIF((load_data->>'driver_user_id'), '')::UUID,
      internal_dispatcher_id = NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      client_id = (load_data->>'client_id')::UUID,
      client_contact_id = NULLIF((load_data->>'client_contact_id'), '')::UUID,
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, 0),
      commodity = NULLIF(load_data->>'commodity', ''),
      weight_lbs = NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      notes = NULLIF(load_data->>'notes', ''),
      customer_name = NULLIF(load_data->>'customer_name', ''),
      factoring_percentage = NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      dispatching_percentage = NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      leasing_percentage = NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      updated_at = now()
    WHERE id = existing_load_id
    RETURNING * INTO result_load;
  END IF;

  -- ================================
  -- 4. HANDLE LOAD STOPS
  -- ================================
  
  -- For edit mode, delete existing stops
  IF operation_type = 'edit' THEN
    DELETE FROM load_stops WHERE load_id = result_load.id;
  END IF;

  -- Insert new stops
  FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data)
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
      actual_date
    ) VALUES (
      result_load.id,
      (stop_record->>'stop_number')::INTEGER,
      stop_record->>'stop_type',
      stop_record->>'company_name',
      stop_record->>'address',
      stop_record->>'city',
      stop_record->>'state',
      stop_record->>'zip_code',
      NULLIF(stop_record->>'reference_number', ''),
      NULLIF(stop_record->>'contact_name', ''),
      NULLIF(stop_record->>'contact_phone', ''),
      NULLIF(stop_record->>'special_instructions', ''),
      NULLIF((stop_record->>'scheduled_date'), '')::DATE,
      NULLIF((stop_record->>'actual_date'), '')::DATE
    );
  END LOOP;

  -- Get the stops for the response
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ls.id,
      'stop_number', ls.stop_number,
      'stop_type', ls.stop_type,
      'company_name', ls.company_name,
      'address', ls.address,
      'city', ls.city,
      'state', ls.state,
      'zip_code', ls.zip_code,
      'scheduled_date', ls.scheduled_date,
      'actual_date', ls.actual_date
    ) ORDER BY ls.stop_number
  ) INTO result_stops
  FROM load_stops ls
  WHERE ls.load_id = result_load.id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'create' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'load', row_to_json(result_load),
    'stops', COALESCE(result_stops, '[]'::jsonb),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de carga: %', SQLERRM;
END;
$function$;