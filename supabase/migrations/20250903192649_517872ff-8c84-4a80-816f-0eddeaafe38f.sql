-- Fix the simple_load_operation_with_deductions function to remove company_id references
-- The loads table doesn't have company_id column, it's linked through payment_period_id

CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  load_data jsonb,
  stops_data jsonb DEFAULT NULL::jsonb,
  load_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  result_load RECORD;
  stop_record RECORD;
  operation_type TEXT;
  target_payment_period_id UUID;
  user_company_id UUID;
  load_delivery_date DATE;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Get user's company
  SELECT ucr.company_id INTO user_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = current_user_id
    AND ucr.is_active = true
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NO_COMPANY';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN load_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- Validate required fields
  IF NULLIF(load_data->>'load_number', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_LOAD_NUMBER_REQUIRED';
  END IF;

  IF NULLIF(load_data->>'driver_user_id', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_DRIVER_REQUIRED';
  END IF;

  -- Extract delivery date for payment period creation
  load_delivery_date := COALESCE(
    (load_data->>'delivery_date')::DATE,
    (load_data->>'pickup_date')::DATE,
    CURRENT_DATE
  );

  -- Ensure payment period exists for this date and company
  target_payment_period_id := create_payment_period_if_needed(user_company_id, load_delivery_date);

  IF target_payment_period_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_PAYMENT_PERIOD_CREATION_FAILED';
  END IF;

  -- For UPDATE operations, validate load exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      JOIN company_payment_periods cpp ON l.payment_period_id = cpp.id
      WHERE l.id = load_id
        AND cpp.company_id = user_company_id
    ) THEN
      RAISE EXCEPTION 'ERROR_LOAD_NOT_FOUND';
    END IF;
  END IF;

  -- Check for duplicate load numbers within company
  IF EXISTS (
    SELECT 1 FROM loads l
    JOIN company_payment_periods cpp ON l.payment_period_id = cpp.id
    WHERE cpp.company_id = user_company_id
      AND l.load_number = load_data->>'load_number'
      AND (load_id IS NULL OR l.id != load_id)
  ) THEN
    RAISE EXCEPTION 'ERROR_LOAD_NUMBER_EXISTS:number:%', load_data->>'load_number';
  END IF;

  -- Create or update load
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
      pickup_date,
      delivery_date,
      client_contact_id,
      po_number,
      payment_period_id,
      internal_dispatcher_id,
      created_by
    ) VALUES (
      load_data->>'load_number',
      (load_data->>'driver_user_id')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'currency', 'USD'),
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      COALESCE(load_data->>'status', 'pending'),
      NULLIF(load_data->>'customer_name', ''),
      NULLIF((load_data->>'client_id'), '')::UUID,
      NULLIF(load_data->>'commodity', ''),
      NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      NULLIF(load_data->>'notes', ''),
      NULLIF((load_data->>'pickup_date'), '')::DATE,
      NULLIF((load_data->>'delivery_date'), '')::DATE,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      NULLIF(load_data->>'po_number', ''),
      target_payment_period_id,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads SET
      load_number = load_data->>'load_number',
      driver_user_id = (load_data->>'driver_user_id')::UUID,
      total_amount = (load_data->>'total_amount')::NUMERIC,
      currency = COALESCE(load_data->>'currency', currency),
      factoring_percentage = COALESCE(NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE(NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE(NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC, leasing_percentage),
      status = COALESCE(load_data->>'status', status),
      customer_name = COALESCE(NULLIF(load_data->>'customer_name', ''), customer_name),
      client_id = COALESCE(NULLIF((load_data->>'client_id'), '')::UUID, client_id),
      commodity = COALESCE(NULLIF(load_data->>'commodity', ''), commodity),
      weight_lbs = COALESCE(NULLIF((load_data->>'weight_lbs'), '')::INTEGER, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes', ''), notes),
      pickup_date = COALESCE(NULLIF((load_data->>'pickup_date'), '')::DATE, pickup_date),
      delivery_date = COALESCE(NULLIF((load_data->>'delivery_date'), '')::DATE, delivery_date),
      client_contact_id = COALESCE(NULLIF((load_data->>'client_contact_id'), '')::UUID, client_contact_id),
      po_number = COALESCE(NULLIF(load_data->>'po_number', ''), po_number),
      payment_period_id = target_payment_period_id,
      internal_dispatcher_id = COALESCE(NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID, internal_dispatcher_id),
      updated_at = now()
    WHERE id = load_id
    RETURNING * INTO result_load;
  END IF;

  -- Handle stops if provided
  IF stops_data IS NOT NULL THEN
    -- Delete existing stops if updating
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;

    -- Insert new stops
    FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data)
    LOOP
      INSERT INTO load_stops (
        load_id,
        stop_type,
        facility_name,
        contact_name,
        contact_phone,
        contact_email,
        street_address,
        city,
        state,
        zip_code,
        scheduled_time,
        actual_time,
        notes,
        stop_number
      ) VALUES (
        result_load.id,
        stop_record.value->>'stop_type',
        NULLIF(stop_record.value->>'facility_name', ''),
        NULLIF(stop_record.value->>'contact_name', ''),
        NULLIF(stop_record.value->>'contact_phone', ''),
        NULLIF(stop_record.value->>'contact_email', ''),
        NULLIF(stop_record.value->>'street_address', ''),
        NULLIF(stop_record.value->>'city', ''),
        NULLIF(stop_record.value->>'state', ''),
        NULLIF(stop_record.value->>'zip_code', ''),
        CASE 
          WHEN NULLIF(stop_record.value->>'scheduled_time', '') IS NOT NULL 
          THEN (stop_record.value->>'scheduled_time')::TIMESTAMP WITH TIME ZONE
          ELSE NULL
        END,
        CASE 
          WHEN NULLIF(stop_record.value->>'actual_time', '') IS NOT NULL 
          THEN (stop_record.value->>'actual_time')::TIMESTAMP WITH TIME ZONE
          ELSE NULL
        END,
        NULLIF(stop_record.value->>'notes', ''),
        COALESCE((stop_record.value->>'stop_number')::INTEGER, 1)
      );
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
    'payment_period_id', target_payment_period_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;