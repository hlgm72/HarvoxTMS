-- Fix RPC function mismatch for load calculations
-- The client is calling simple_load_operation_with_deductions with 3 parameters
-- but we have two functions with different signatures. We need to ensure the 
-- function matches what the client is sending.

-- Drop both versions to avoid conflicts
DROP FUNCTION IF EXISTS public.simple_load_operation_with_deductions(text, jsonb, jsonb[], uuid);
DROP FUNCTION IF EXISTS public.simple_load_operation_with_deductions(jsonb, jsonb, uuid);

-- Create the correct function that matches client call: load_data, stops_data, load_id
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  load_data jsonb, 
  stops_data jsonb DEFAULT '[]'::jsonb, 
  load_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  target_payment_period_id UUID;
  old_payment_period_id UUID;
  result_load RECORD;
  stop_record jsonb;
  operation_type TEXT;
  target_load_date DATE;
  input_load_id UUID := load_id;
  calculated_status TEXT;
  calculation_id UUID;
  calc_result JSONB;
  stops_array jsonb[];
BEGIN
  -- DEBUG: Log start of function
  RAISE NOTICE '🚨 RPC DEBUG: ===== STARTING simple_load_operation_with_deductions =====';
  RAISE NOTICE '🚨 RPC DEBUG: load_data: %', load_data;
  RAISE NOTICE '🚨 RPC DEBUG: stops_data: %', stops_data;
  RAISE NOTICE '🚨 RPC DEBUG: load_id: %', load_id;

  -- Convert stops_data to array format if it's not already
  IF jsonb_typeof(stops_data) = 'array' THEN
    -- Convert jsonb array to jsonb[] array
    SELECT array_agg(value) INTO stops_array FROM jsonb_array_elements(stops_data);
  ELSE
    stops_array := ARRAY[]::jsonb[];
  END IF;

  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  RAISE NOTICE '🚨 RPC DEBUG: current_user_id: %', current_user_id;

  -- Extract load date for payment period creation
  target_load_date := COALESCE((load_data->>'delivery_date')::DATE, (load_data->>'pickup_date')::DATE, CURRENT_DATE);

  RAISE NOTICE '🚨 RPC DEBUG: target_load_date: %', target_load_date;

  -- Get company from user's role for creating payment period
  SELECT DISTINCT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = current_user_id
    AND ucr.is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_COMPANY_NOT_FOUND';
  END IF;

  RAISE NOTICE '🚨 RPC DEBUG: target_company_id: %', target_company_id;

  -- Determine operation type
  operation_type := CASE WHEN input_load_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  RAISE NOTICE '🚨 RPC DEBUG: operation_type: %', operation_type;

  -- For UPDATE operations, get the old payment period for comparison
  IF operation_type = 'UPDATE' THEN
    SELECT l.payment_period_id INTO old_payment_period_id
    FROM loads l 
    WHERE l.id = input_load_id;
    
    RAISE NOTICE '🚨 RPC DEBUG: old_payment_period_id: %', old_payment_period_id;
  END IF;

  -- Create payment period if needed using the company_id and target date
  target_payment_period_id := create_payment_period_if_needed(target_company_id, target_load_date);

  RAISE NOTICE '🚨 RPC DEBUG: target_payment_period_id: %', target_payment_period_id;

  -- Calculate status based on driver assignment
  IF load_data->>'status' IS NOT NULL THEN
    calculated_status := load_data->>'status';
  ELSE
    IF NULLIF((load_data->>'driver_user_id'), '') IS NOT NULL THEN
      calculated_status := 'assigned';
    ELSE
      calculated_status := 'created';
    END IF;
  END IF;

  RAISE NOTICE '🚨 RPC DEBUG: calculated_status: %', calculated_status;
  RAISE NOTICE '🚨 RPC DEBUG: driver_user_id from load_data: %', load_data->>'driver_user_id';

  -- Create or update load
  IF operation_type = 'CREATE' THEN
    RAISE NOTICE '🚨 RPC DEBUG: About to INSERT load';
    
    INSERT INTO loads (
      load_number,
      driver_user_id,
      pickup_date,
      delivery_date,
      commodity,
      weight_lbs,
      total_amount,
      status,
      internal_dispatcher_id,
      po_number,
      customer_name,
      client_id,
      client_contact_id,
      dispatching_percentage,
      factoring_percentage,
      leasing_percentage,
      payment_period_id,
      notes,
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'pickup_date'), '')::DATE,
      NULLIF((load_data->>'delivery_date'), '')::DATE,
      load_data->>'commodity',
      NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      NULLIF((load_data->>'total_amount'), '')::NUMERIC,
      calculated_status,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      load_data->>'po_number',
      load_data->>'customer_name',
      NULLIF((load_data->>'client_id'), '')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      COALESCE(NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC, 0),
      COALESCE(NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC, 0),
      COALESCE(NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC, 0),
      target_payment_period_id,
      load_data->>'notes',
      current_user_id
    ) RETURNING * INTO result_load;

    RAISE NOTICE '🚨 RPC DEBUG: Load created with ID: %', result_load.id;

  ELSE
    RAISE NOTICE '🚨 RPC DEBUG: About to UPDATE load with ID: %', input_load_id;
    
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = NULLIF((load_data->>'driver_user_id'), '')::UUID,
      pickup_date = NULLIF((load_data->>'pickup_date'), '')::DATE,
      delivery_date = NULLIF((load_data->>'delivery_date'), '')::DATE,
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE(NULLIF((load_data->>'weight_lbs'), '')::INTEGER, weight_lbs),
      total_amount = COALESCE(NULLIF((load_data->>'total_amount'), '')::NUMERIC, total_amount),
      status = calculated_status,
      internal_dispatcher_id = NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      po_number = COALESCE(load_data->>'po_number', po_number),
      customer_name = COALESCE(load_data->>'customer_name', customer_name),
      client_id = NULLIF((load_data->>'client_id'), '')::UUID,
      client_contact_id = NULLIF((load_data->>'client_contact_id'), '')::UUID,
      dispatching_percentage = COALESCE(NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC, dispatching_percentage),
      factoring_percentage = COALESCE(NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC, factoring_percentage),
      leasing_percentage = COALESCE(NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC, leasing_percentage),
      payment_period_id = target_payment_period_id,
      notes = COALESCE(load_data->>'notes', notes),
      updated_at = now()
    WHERE id = input_load_id
    RETURNING * INTO result_load;

    RAISE NOTICE '🚨 RPC DEBUG: Load updated successfully';
  END IF;

  -- Handle load stops
  IF array_length(stops_array, 1) > 0 THEN
    RAISE NOTICE '🚨 RPC DEBUG: Processing % stops', array_length(stops_array, 1);
    
    -- Delete existing stops for this load (if updating)
    DELETE FROM load_stops WHERE load_id = result_load.id;
    
    -- Insert new stops
    FOR stop_record IN SELECT unnest(stops_array) LOOP
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
        result_load.id,
        COALESCE((stop_record->>'stop_number')::INTEGER, 1),
        stop_record->>'stop_type',
        stop_record->>'company_name',
        stop_record->>'address',
        stop_record->>'city',
        stop_record->>'state',
        stop_record->>'zip_code',
        stop_record->>'reference_number',
        stop_record->>'contact_name',
        stop_record->>'contact_phone',
        stop_record->>'special_instructions',
        NULLIF((stop_record->>'scheduled_date'), '')::DATE,
        NULLIF(stop_record->>'scheduled_time', ''),
        NULLIF((stop_record->>'actual_date'), '')::DATE
      );
    END LOOP;
    
    RAISE NOTICE '🚨 RPC DEBUG: Stops processed successfully';
  END IF;

  -- Generate automatic deductions if driver is assigned
  IF result_load.driver_user_id IS NOT NULL THEN
    RAISE NOTICE '🚨 RPC DEBUG: Generating automatic deductions for driver: %', result_load.driver_user_id;
    
    -- Create driver calculation if it doesn't exist
    SELECT id INTO calculation_id
    FROM driver_period_calculations
    WHERE driver_user_id = result_load.driver_user_id
    AND company_payment_period_id = target_payment_period_id;
    
    IF calculation_id IS NULL THEN
      INSERT INTO driver_period_calculations (
        driver_user_id,
        company_payment_period_id,
        gross_earnings,
        fuel_expenses,
        total_deductions,
        other_income,
        total_income,
        net_payment,
        payment_status,
        has_negative_balance
      ) VALUES (
        result_load.driver_user_id,
        target_payment_period_id,
        0, 0, 0, 0, 0, 0,
        'calculated',
        false
      ) RETURNING id INTO calculation_id;
      
      RAISE NOTICE '🚨 RPC DEBUG: Created new driver calculation: %', calculation_id;
    END IF;
    
    -- Calculate deductions and recalculate totals
    SELECT calculate_driver_payment_period_with_validation(calculation_id) INTO calc_result;
    
    RAISE NOTICE '🚨 RPC DEBUG: Recalculation result: %', calc_result;
  END IF;

  -- If we had an old period and it's different from new period, recalculate old period too
  IF operation_type = 'UPDATE' AND old_payment_period_id IS NOT NULL 
     AND old_payment_period_id != target_payment_period_id THEN
    
    RAISE NOTICE '🚨 RPC DEBUG: Recalculating old payment period: %', old_payment_period_id;
    
    -- Find driver calculation for old period and recalculate
    SELECT id INTO calculation_id
    FROM driver_period_calculations
    WHERE driver_user_id = result_load.driver_user_id
    AND company_payment_period_id = old_payment_period_id;
    
    IF calculation_id IS NOT NULL THEN
      SELECT calculate_driver_payment_period_with_validation(calculation_id) INTO calc_result;
      RAISE NOTICE '🚨 RPC DEBUG: Old period recalculation result: %', calc_result;
    END IF;
  END IF;

  RAISE NOTICE '🚨 RPC DEBUG: ===== OPERATION COMPLETED SUCCESSFULLY =====';

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_id', target_payment_period_id,
    'automatic_deductions', true,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;