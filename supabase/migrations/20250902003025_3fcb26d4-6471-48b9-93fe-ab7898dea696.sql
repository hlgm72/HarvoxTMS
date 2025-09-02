-- Corregir el error de casting en la función simple_load_operation
CREATE OR REPLACE FUNCTION public.simple_load_operation(
  operation_type TEXT,
  load_data JSONB,
  stops_data JSONB[] DEFAULT '{}',
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
  result_stops JSONB[] := '{}';
  stop_data JSONB;
  stop_result JSONB;
  payment_period_id_result UUID;
  load_pickup_date DATE;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Get company_id from driver_user_id or current user
  IF (load_data->>'driver_user_id')::UUID IS NOT NULL THEN
    SELECT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (load_data->>'driver_user_id')::UUID
    AND ucr.is_active = true
    LIMIT 1;
  ELSE
    -- If no driver assigned, use current user's company
    SELECT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.is_active = true
    LIMIT 1;
  END IF;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COMPANY_NOT_FOUND';
  END IF;

  -- Validate user has permissions in this company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_LOADS';
  END IF;

  -- Extract pickup date for payment period creation
  load_pickup_date := (load_data->>'pickup_date')::DATE;
  IF load_pickup_date IS NULL AND array_length(stops_data, 1) > 0 THEN
    -- Get pickup date from first pickup stop
    FOR stop_data IN SELECT unnest(stops_data) LOOP
      IF stop_data->>'stop_type' = 'pickup' AND (stop_data->>'scheduled_date') IS NOT NULL THEN
        load_pickup_date := (stop_data->>'scheduled_date')::DATE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Ensure payment period exists if we have a pickup date
  IF load_pickup_date IS NOT NULL THEN
    payment_period_id_result := create_payment_period_if_needed(target_company_id, load_pickup_date);
  END IF;

  -- Perform load operation
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number,
      driver_user_id,
      total_amount,
      currency,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      status,
      customer_name,
      client_id,
      commodity,
      weight_lbs,
      notes,
      created_by,
      payment_period_id,
      pickup_date,
      delivery_date,
      po_number
    ) VALUES (
      load_data->>'load_number',
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'currency', 'USD'),
      (load_data->>'factoring_percentage')::NUMERIC,
      (load_data->>'dispatching_percentage')::NUMERIC,
      (load_data->>'leasing_percentage')::NUMERIC,
      COALESCE(load_data->>'status', 'assigned'),
      load_data->>'customer_name',
      NULLIF((load_data->>'client_id'), '')::UUID,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::INTEGER,
      load_data->>'notes',
      current_user_id,
      payment_period_id_result,
      load_pickup_date,
      (load_data->>'delivery_date')::DATE,
      load_data->>'po_number'
    ) RETURNING * INTO result_load;
  ELSE
    -- UPDATE operation
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      currency = COALESCE(load_data->>'currency', currency),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      status = COALESCE(load_data->>'status', status),
      customer_name = COALESCE(load_data->>'customer_name', customer_name),
      client_id = COALESCE(NULLIF((load_data->>'client_id'), '')::UUID, client_id),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::INTEGER, weight_lbs),
      notes = COALESCE(load_data->>'notes', notes),
      payment_period_id = COALESCE(payment_period_id_result, payment_period_id),
      pickup_date = COALESCE(load_pickup_date, pickup_date),
      delivery_date = COALESCE((load_data->>'delivery_date')::DATE, delivery_date),
      po_number = COALESCE(load_data->>'po_number', po_number),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  -- Process stops if provided
  IF array_length(stops_data, 1) > 0 THEN
    -- Delete existing stops for UPDATE operations
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;

    -- Insert new stops using correct column names
    FOR stop_data IN SELECT unnest(stops_data) LOOP
      -- Insert the stop first
      INSERT INTO load_stops (
        load_id,
        stop_number,
        stop_type,
        company_name,
        address,
        city,
        state,
        zip_code,
        scheduled_date,
        scheduled_time,
        contact_name,
        contact_phone,
        special_instructions,
        reference_number
      ) VALUES (
        result_load.id,
        (stop_data->>'stop_number')::INTEGER,
        stop_data->>'stop_type',
        stop_data->>'company_name',
        stop_data->>'address',
        stop_data->>'city',
        stop_data->>'state',
        stop_data->>'zip_code',
        NULLIF((stop_data->>'scheduled_date'), '')::DATE,
        NULLIF((stop_data->>'scheduled_time'), '')::TIME,
        stop_data->>'contact_name',
        stop_data->>'contact_phone',
        stop_data->>'special_instructions',
        stop_data->>'reference_number'
      );
      
      -- Build the JSONB result manually
      stop_result := jsonb_build_object(
        'stop_number', (stop_data->>'stop_number')::INTEGER,
        'stop_type', stop_data->>'stop_type',
        'company_name', stop_data->>'company_name',
        'address', stop_data->>'address',
        'city', stop_data->>'city',
        'state', stop_data->>'state',
        'zip_code', stop_data->>'zip_code',
        'scheduled_date', NULLIF((stop_data->>'scheduled_date'), '')::DATE,
        'scheduled_time', NULLIF((stop_data->>'scheduled_time'), '')::TIME,
        'contact_name', stop_data->>'contact_name',
        'contact_phone', stop_data->>'contact_phone',
        'special_instructions', stop_data->>'special_instructions',
        'reference_number', stop_data->>'reference_number'
      );
      
      result_stops := result_stops || stop_result;
    END LOOP;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'stops', result_stops,
    'payment_period_id', payment_period_id_result,
    'company_id', target_company_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;