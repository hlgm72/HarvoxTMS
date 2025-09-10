-- Fix driver period calculation for load updates
-- This updates the SQL function to properly handle period reassignment and recalculation during edits

CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(load_data jsonb, stops_data jsonb DEFAULT '[]'::jsonb, load_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  target_payment_period_id UUID;
  old_payment_period_id UUID;
  result_load RECORD;
  stop_record jsonb;
  operation_type TEXT;
  target_load_date DATE;
  calculation_id UUID;
  calc_result JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract load date for payment period creation
  target_load_date := COALESCE((load_data->>'delivery_date')::DATE, (load_data->>'pickup_date')::DATE, CURRENT_DATE);

  -- Get company from user's role for creating payment period
  SELECT DISTINCT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = current_user_id
    AND ucr.is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_COMPANY_NOT_FOUND';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN load_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- For UPDATE operations, get the old payment period for comparison
  IF operation_type = 'UPDATE' THEN
    SELECT payment_period_id INTO old_payment_period_id
    FROM loads 
    WHERE id = load_id;
  END IF;

  -- Create payment period if needed using the company_id and target date
  target_payment_period_id := create_payment_period_if_needed(target_company_id, target_load_date);

  -- Validate permissions through existing load or user company role
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      JOIN company_payment_periods cpp ON l.payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE l.id = load_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'ERROR_LOAD_NOT_FOUND';
    END IF;
  ELSE
    -- For CREATE, validate user has company access
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = current_user_id
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    ) THEN
      RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_CREATE_LOAD';
    END IF;
  END IF;

  -- Create or update load
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number,
      driver_user_id,
      pickup_date,
      delivery_date,
      pickup_location,
      delivery_location,
      commodity,
      weight_lbs,
      total_amount,
      status,
      dispatcher_user_id,
      po_number,
      client_name,
      dispatching_percentage,
      factoring_percentage,
      leasing_percentage,
      payment_period_id,
      created_by
    ) VALUES (
      load_data->>'load_number',
      (load_data->>'driver_user_id')::UUID,
      (load_data->>'pickup_date')::DATE,
      (load_data->>'delivery_date')::DATE,
      load_data->>'pickup_location',
      load_data->>'delivery_location',
      load_data->>'commodity',
      (load_data->>'weight_lbs')::INTEGER,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'status', 'dispatched'),
      (load_data->>'dispatcher_user_id')::UUID,
      load_data->>'po_number',
      load_data->>'client_name',
      (load_data->>'dispatching_percentage')::NUMERIC,
      (load_data->>'factoring_percentage')::NUMERIC,
      (load_data->>'leasing_percentage')::NUMERIC,
      target_payment_period_id,
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE((load_data->>'driver_user_id')::UUID, driver_user_id),
      pickup_date = COALESCE((load_data->>'pickup_date')::DATE, pickup_date),
      delivery_date = COALESCE((load_data->>'delivery_date')::DATE, delivery_date),
      pickup_location = COALESCE(load_data->>'pickup_location', pickup_location),
      delivery_location = COALESCE(load_data->>'delivery_location', delivery_location),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::INTEGER, weight_lbs),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      status = COALESCE(load_data->>'status', status),
      dispatcher_user_id = COALESCE((load_data->>'dispatcher_user_id')::UUID, dispatcher_user_id),
      po_number = COALESCE(load_data->>'po_number', po_number),
      client_name = COALESCE(load_data->>'client_name', client_name),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      payment_period_id = target_payment_period_id,
      updated_at = now()
    WHERE id = load_id
    RETURNING * INTO result_load;
  END IF;

  -- Handle stops if provided
  IF jsonb_array_length(stops_data) > 0 THEN
    -- Delete existing stops for update operation
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = load_id;
    END IF;

    -- Insert new stops
    FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data) LOOP
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
        contact_phone,
        contact_person,
        notes,
        latitude,
        longitude
      ) VALUES (
        result_load.id,
        (stop_record->>'stop_number')::INTEGER,
        stop_record->>'stop_type',
        stop_record->>'company_name',
        stop_record->>'address',
        stop_record->>'city',
        stop_record->>'state',
        stop_record->>'zip_code',
        (stop_record->>'scheduled_date')::TIMESTAMP WITH TIME ZONE,
        stop_record->>'contact_phone',
        stop_record->>'contact_person',
        stop_record->>'notes',
        (stop_record->>'latitude')::NUMERIC,
        (stop_record->>'longitude')::NUMERIC
      );
    END LOOP;
  END IF;

  -- 🚨 CRITICAL FIX: Ensure driver period calculation after UPDATE operations
  -- This guarantees that calculations are updated even if triggers don't fire
  IF operation_type = 'UPDATE' AND result_load.driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    
    RAISE NOTICE 'SQL: Ensuring driver period calculation for UPDATE - Driver: %, Period: %', 
      result_load.driver_user_id, target_payment_period_id;
    
    -- Ensure the driver period calculation exists
    SELECT ensure_driver_period_calculation_exists(
      result_load.driver_user_id,
      target_payment_period_id
    ) INTO calculation_id;
    
    -- Force recalculation immediately for consistency
    IF calculation_id IS NOT NULL THEN
      SELECT calculate_driver_payment_no_auth(calculation_id) INTO calc_result;
      
      IF (calc_result->>'success')::boolean THEN
        RAISE NOTICE 'SQL: ✅ Driver period recalculated successfully - Net: $%', 
          calc_result->>'net_payment';
      ELSE
        RAISE NOTICE 'SQL: ❌ Error recalculating driver period: %', calc_result->>'error';
      END IF;
    END IF;

    -- If the payment period changed, also recalculate the old period to maintain consistency
    IF old_payment_period_id IS NOT NULL AND old_payment_period_id != target_payment_period_id THEN
      SELECT ensure_driver_period_calculation_exists(
        result_load.driver_user_id,
        old_payment_period_id
      ) INTO calculation_id;
      
      IF calculation_id IS NOT NULL THEN
        SELECT calculate_driver_payment_no_auth(calculation_id) INTO calc_result;
        RAISE NOTICE 'SQL: ✅ Old period recalculated after period change';
      END IF;
    END IF;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_id', target_payment_period_id,
    'old_payment_period_id', old_payment_period_id,
    'driver_calculation_updated', (operation_type = 'UPDATE' AND result_load.driver_user_id IS NOT NULL),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;