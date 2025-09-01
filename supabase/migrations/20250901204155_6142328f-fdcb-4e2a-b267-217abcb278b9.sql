CREATE OR REPLACE FUNCTION public.simple_load_operation(
  operation_type text,
  load_data jsonb,
  stops_data jsonb DEFAULT '[]'::jsonb,
  load_id_param uuid DEFAULT NULL
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
  operation_result TEXT;
  load_id UUID;
  stop_record RECORD;
  stops_created INTEGER := 0;
  stops_updated INTEGER := 0;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Get company_id from user's active role
  SELECT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = current_user_id
    AND ucr.is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COMPANY_NOT_FOUND';
  END IF;

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin', 'driver', 'dispatcher')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_LOADS';
  END IF;

  -- Validate operation type
  IF operation_type NOT IN ('CREATE', 'UPDATE') THEN
    RAISE EXCEPTION 'ERROR_INVALID_OPERATION_TYPE';
  END IF;

  -- For UPDATE operations, validate load exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF load_id_param IS NULL THEN
      RAISE EXCEPTION 'ERROR_LOAD_ID_REQUIRED_FOR_UPDATE';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = load_id_param
      AND (l.driver_user_id IN (
        SELECT ucr.user_id FROM user_company_roles ucr 
        WHERE ucr.company_id = target_company_id AND ucr.is_active = true
      ) OR l.created_by IN (
        SELECT ucr.user_id FROM user_company_roles ucr 
        WHERE ucr.company_id = target_company_id AND ucr.is_active = true
      ))
    ) THEN
      RAISE EXCEPTION 'ERROR_LOAD_NOT_FOUND';
    END IF;
    
    load_id := load_id_param;
  END IF;

  -- Validate required fields
  IF NULLIF(load_data->>'load_number', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_LOAD_NUMBER_REQUIRED';
  END IF;

  IF NULLIF(load_data->>'driver_user_id', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_DRIVER_REQUIRED';
  END IF;

  -- Check for duplicate load numbers within company (exclude current load if updating)
  IF EXISTS (
    SELECT 1 FROM loads l
    JOIN user_company_roles ucr ON (l.driver_user_id = ucr.user_id OR l.created_by = ucr.user_id)
    WHERE ucr.company_id = target_company_id
    AND l.load_number = load_data->>'load_number'
    AND ucr.is_active = true
    AND (operation_type = 'CREATE' OR l.id != load_id_param)
  ) THEN
    RAISE EXCEPTION 'ERROR_LOAD_NUMBER_EXISTS:number:%', load_data->>'load_number';
  END IF;

  -- Create or update load
  IF operation_type = 'CREATE' THEN
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
      payment_period_id,
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
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      NULLIF((load_data->>'payment_period_id'), '')::UUID,
      COALESCE(load_data->>'status', 'created'),
      current_user_id
    ) RETURNING * INTO result_load;
    
    load_id := result_load.id;
    operation_result := 'CREATE';
  ELSE
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
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      payment_period_id = NULLIF((load_data->>'payment_period_id'), '')::UUID,
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
    
    operation_result := 'UPDATE';
  END IF;

  -- Handle stops data if provided
  IF jsonb_array_length(stops_data) > 0 THEN
    -- For UPDATE operations, delete existing stops first
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = load_id;
    END IF;

    -- Insert new stops
    FOR stop_record IN 
      SELECT value FROM jsonb_array_elements(stops_data)
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
        contact_name,
        contact_phone,
        reference_number,
        scheduled_date,
        scheduled_time,
        actual_date,
        special_instructions
      ) VALUES (
        load_id,
        (stop_record.value->>'stop_number')::INTEGER,
        stop_record.value->>'stop_type',
        NULLIF(stop_record.value->>'company_name', ''),
        NULLIF(stop_record.value->>'address', ''),
        NULLIF(stop_record.value->>'city', ''),
        NULLIF(stop_record.value->>'state', ''),
        NULLIF(stop_record.value->>'zip_code', ''),
        NULLIF(stop_record.value->>'contact_name', ''),
        NULLIF(stop_record.value->>'contact_phone', ''),
        NULLIF(stop_record.value->>'reference_number', ''),
        NULLIF((stop_record.value->>'scheduled_date'), '')::DATE,
        NULLIF(stop_record.value->>'scheduled_time', ''),
        NULLIF((stop_record.value->>'actual_date'), '')::DATE,
        NULLIF(stop_record.value->>'special_instructions', '')
      );
      
      stops_created := stops_created + 1;
    END LOOP;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_result,
    'message', CASE 
      WHEN operation_result = 'CREATE' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'load', row_to_json(result_load),
    'stops_processed', stops_created,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;