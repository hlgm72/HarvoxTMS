-- Fix scheduled_time data type conversion in simple_load_operation function
CREATE OR REPLACE FUNCTION public.simple_load_operation(operation_type text, load_data jsonb, stops_data jsonb[] DEFAULT '{}'::jsonb[], load_id_param uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load RECORD;
  result_stops JSONB[] := '{}';
  stop_data JSONB;
  stop_result JSONB;
  payment_period_id_result UUID;
  load_pickup_date DATE;
  load_status TEXT;
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

  -- Determine load status based on driver assignment
  IF load_data->>'status' IS NOT NULL THEN
    load_status := load_data->>'status';
  ELSE
    -- If no status provided, determine based on driver assignment
    IF NULLIF((load_data->>'driver_user_id'), '') IS NOT NULL THEN
      load_status := 'assigned';
    ELSE
      load_status := 'unassigned';
    END IF;
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
      internal_dispatcher_id,
      total_amount,
      currency,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      po_number,
      client_id,
      client_contact_id,
      commodity,
      weight_lbs,
      notes,
      customer_name,
      status,
      payment_period_id,
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'currency', 'USD'),
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      NULLIF(load_data->>'po_number', ''),
      NULLIF((load_data->>'client_id'), '')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      NULLIF(load_data->>'commodity', ''),
      NULLIF((load_data->>'weight_lbs'), '')::NUMERIC,
      NULLIF(load_data->>'notes', ''),
      NULLIF(load_data->>'customer_name', ''),
      load_status,
      payment_period_id_result,
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    -- UPDATE operation
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      internal_dispatcher_id = COALESCE(NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID, internal_dispatcher_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      currency = COALESCE(load_data->>'currency', currency),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      po_number = COALESCE(NULLIF(load_data->>'po_number', ''), po_number),
      client_id = COALESCE(NULLIF((load_data->>'client_id'), '')::UUID, client_id),
      client_contact_id = COALESCE(NULLIF((load_data->>'client_contact_id'), '')::UUID, client_contact_id),
      commodity = COALESCE(NULLIF(load_data->>'commodity', ''), commodity),
      weight_lbs = COALESCE(NULLIF((load_data->>'weight_lbs'), '')::NUMERIC, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes', ''), notes),
      customer_name = COALESCE(NULLIF(load_data->>'customer_name', ''), customer_name),
      status = COALESCE(load_data->>'status', status),
      payment_period_id = COALESCE(payment_period_id_result, payment_period_id),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  -- Process stops data
  IF array_length(stops_data, 1) > 0 THEN
    -- Delete existing stops for UPDATE operations
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = load_id_param;
    END IF;

    -- Insert new stops
    FOR stop_data IN SELECT unnest(stops_data) LOOP
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
        special_instructions
      ) VALUES (
        result_load.id,
        (stop_data->>'stop_number')::INTEGER,
        stop_data->>'stop_type',
        stop_data->>'company_name',
        stop_data->>'address',
        stop_data->>'city',
        stop_data->>'state',
        stop_data->>'zip_code',
        stop_data->>'contact_name',
        stop_data->>'contact_phone',
        stop_data->>'reference_number',
        NULLIF((stop_data->>'scheduled_date'), '')::DATE,
        CASE 
          WHEN NULLIF(stop_data->>'scheduled_time', '') IS NOT NULL 
          THEN (stop_data->>'scheduled_time')::TIME
          ELSE NULL 
        END,
        stop_data->>'special_instructions'
      ) RETURNING jsonb_build_object(
        'id', id,
        'stop_number', stop_number,
        'stop_type', stop_type,
        'company_name', company_name,
        'city', city,
        'state', state
      ) INTO stop_result;
      
      result_stops := result_stops || stop_result;
    END LOOP;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'load', row_to_json(result_load),
    'stops', result_stops,
    'payment_period_id', payment_period_id_result,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;