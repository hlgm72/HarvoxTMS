-- Corregir función simple_load_operation para manejar scheduled_time correctamente
DROP FUNCTION IF EXISTS simple_load_operation(TEXT, JSONB, JSONB, UUID);

CREATE OR REPLACE FUNCTION simple_load_operation(
  operation_type TEXT,
  load_data JSONB,
  stops_data JSONB DEFAULT '[]'::JSONB,
  load_id_param UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load RECORD;
  load_id UUID;
  stop_record JSONB;
  new_stop_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Validate required fields
  IF operation_type NOT IN ('CREATE', 'UPDATE') THEN
    RAISE EXCEPTION 'ERROR_INVALID_OPERATION_TYPE: %', operation_type;
  END IF;

  -- Get company_id from user role (ensure user has permissions)
  SELECT DISTINCT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = current_user_id 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_LOADS';
  END IF;

  -- Create or update load
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      company_id,
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
      created_by,
      updated_by
    ) VALUES (
      target_company_id,
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF(load_data->>'driver_user_id', '')::UUID,
      NULLIF(load_data->>'internal_dispatcher_id', '')::UUID,
      NULLIF(load_data->>'client_id', '')::UUID,
      NULLIF(load_data->>'client_contact_id', '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      NULLIF(load_data->>'commodity', ''),
      NULLIF(load_data->>'weight_lbs', '')::NUMERIC,
      NULLIF(load_data->>'notes', ''),
      NULLIF(load_data->>'customer_name', ''),
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      NULLIF(load_data->>'payment_period_id', '')::UUID,
      'assigned',
      current_user_id,
      current_user_id
    ) RETURNING * INTO result_load;
    
    load_id := result_load.id;
    
  ELSE -- UPDATE
    load_id := load_id_param;
    
    IF load_id IS NULL THEN
      RAISE EXCEPTION 'ERROR_LOAD_ID_REQUIRED_FOR_UPDATE';
    END IF;
    
    -- Verify user has access to this load
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      WHERE l.id = load_id 
        AND l.company_id = target_company_id
    ) THEN
      RAISE EXCEPTION 'ERROR_LOAD_NOT_FOUND_OR_NO_ACCESS';
    END IF;
    
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      po_number = COALESCE(NULLIF(load_data->>'po_number', ''), po_number),
      driver_user_id = COALESCE(NULLIF(load_data->>'driver_user_id', '')::UUID, driver_user_id),
      internal_dispatcher_id = COALESCE(NULLIF(load_data->>'internal_dispatcher_id', '')::UUID, internal_dispatcher_id),
      client_id = COALESCE(NULLIF(load_data->>'client_id', '')::UUID, client_id),
      client_contact_id = COALESCE(NULLIF(load_data->>'client_contact_id', '')::UUID, client_contact_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      commodity = COALESCE(NULLIF(load_data->>'commodity', ''), commodity),
      weight_lbs = COALESCE(NULLIF(load_data->>'weight_lbs', '')::NUMERIC, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes', ''), notes),
      customer_name = COALESCE(NULLIF(load_data->>'customer_name', ''), customer_name),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      payment_period_id = COALESCE(NULLIF(load_data->>'payment_period_id', '')::UUID, payment_period_id),
      updated_by = current_user_id,
      updated_at = now()
    WHERE id = load_id
    RETURNING * INTO result_load;
  END IF;

  -- Handle stops data (delete existing and insert new for both CREATE and UPDATE)
  DELETE FROM load_stops WHERE load_id = load_id;
  
  -- Insert stops
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
      contact_name,
      contact_phone,
      reference_number,
      special_instructions,
      scheduled_date,
      scheduled_time,
      actual_date
    ) VALUES (
      load_id,
      (stop_record->>'stop_number')::INTEGER,
      stop_record->>'stop_type',
      stop_record->>'company_name',
      stop_record->>'address',
      stop_record->>'city',
      stop_record->>'state',
      stop_record->>'zip_code',
      NULLIF(stop_record->>'contact_name', ''),
      NULLIF(stop_record->>'contact_phone', ''),
      NULLIF(stop_record->>'reference_number', ''),
      NULLIF(stop_record->>'special_instructions', ''),
      NULLIF(stop_record->>'scheduled_date', '')::DATE,
      -- ✅ CONVERSIÓN CORRECTA DE scheduled_time
      CASE 
        WHEN NULLIF(stop_record->>'scheduled_time', '') IS NULL THEN NULL
        ELSE NULLIF(stop_record->>'scheduled_time', '')::TIME
      END,
      NULLIF(stop_record->>'actual_date', '')::DATE
    );
  END LOOP;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;