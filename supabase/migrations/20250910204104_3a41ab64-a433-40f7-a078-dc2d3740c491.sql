-- Fix the remaining customer_rate reference in simple_load_operation_with_deductions function
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(load_data jsonb, stops_data jsonb DEFAULT '[]'::jsonb, load_id_param uuid DEFAULT NULL::uuid)
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
  input_load_id UUID := load_id_param;
  calculated_status TEXT;
  calculation_id UUID;
  calc_result JSONB;
  stops_array jsonb[];
BEGIN
  -- DEBUG: Log start of function
  RAISE NOTICE '🚨 RPC DEBUG: ===== STARTING simple_load_operation_with_deductions =====';
  RAISE NOTICE '🚨 RPC DEBUG: load_data: %', load_data;
  RAISE NOTICE '🚨 RPC DEBUG: stops_data: %', stops_data;
  RAISE NOTICE '🚨 RPC DEBUG: load_id_param: %', load_id_param;

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
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      target_payment_period_id,
      load_data->>'notes',
      current_user_id
    ) RETURNING * INTO result_load;
    
    RAISE NOTICE '🚨 RPC DEBUG: Load created successfully with ID: %', result_load.id;
  ELSE
    -- UPDATE operation
    RAISE NOTICE '🚨 RPC DEBUG: About to UPDATE load: %', input_load_id;
    
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = CASE 
        WHEN load_data ? 'driver_user_id' THEN NULLIF((load_data->>'driver_user_id'), '')::UUID
        ELSE driver_user_id 
      END,
      pickup_date = CASE 
        WHEN load_data ? 'pickup_date' THEN NULLIF((load_data->>'pickup_date'), '')::DATE
        ELSE pickup_date 
      END,
      delivery_date = CASE 
        WHEN load_data ? 'delivery_date' THEN NULLIF((load_data->>'delivery_date'), '')::DATE
        ELSE delivery_date 
      END,
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = CASE 
        WHEN load_data ? 'weight_lbs' THEN NULLIF((load_data->>'weight_lbs'), '')::INTEGER
        ELSE weight_lbs 
      END,
      total_amount = CASE 
        WHEN load_data ? 'total_amount' THEN NULLIF((load_data->>'total_amount'), '')::NUMERIC
        ELSE total_amount 
      END,
      status = COALESCE(calculated_status, status),
      internal_dispatcher_id = CASE 
        WHEN load_data ? 'internal_dispatcher_id' THEN NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID
        ELSE internal_dispatcher_id 
      END,
      po_number = CASE 
        WHEN load_data ? 'po_number' THEN load_data->>'po_number'
        ELSE po_number 
      END,
      customer_name = COALESCE(load_data->>'customer_name', customer_name),
      client_id = CASE 
        WHEN load_data ? 'client_id' THEN NULLIF((load_data->>'client_id'), '')::UUID
        ELSE client_id 
      END,
      client_contact_id = CASE 
        WHEN load_data ? 'client_contact_id' THEN NULLIF((load_data->>'client_contact_id'), '')::UUID
        ELSE client_contact_id 
      END,
      dispatching_percentage = CASE 
        WHEN load_data ? 'dispatching_percentage' THEN NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC
        ELSE dispatching_percentage 
      END,
      factoring_percentage = CASE 
        WHEN load_data ? 'factoring_percentage' THEN NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC
        ELSE factoring_percentage 
      END,
      leasing_percentage = CASE 
        WHEN load_data ? 'leasing_percentage' THEN NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC
        ELSE leasing_percentage 
      END,
      payment_period_id = target_payment_period_id,
      notes = CASE 
        WHEN load_data ? 'notes' THEN load_data->>'notes'
        ELSE notes 
      END,
      updated_at = now()
    WHERE id = input_load_id
    RETURNING * INTO result_load;
    
    RAISE NOTICE '🚨 RPC DEBUG: Load updated successfully';
  END IF;

  -- Process stops data
  IF array_length(stops_array, 1) > 0 THEN
    RAISE NOTICE '🚨 RPC DEBUG: Processing % stops', array_length(stops_array, 1);
    
    FOREACH stop_record IN ARRAY stops_array LOOP
      RAISE NOTICE '🚨 RPC DEBUG: Processing stop: %', stop_record;
      
      IF (stop_record->>'id')::UUID IS NOT NULL THEN
        -- Update existing stop
        UPDATE load_stops SET
          stop_number = COALESCE((stop_record->>'stop_number')::INTEGER, stop_number),
          stop_type = COALESCE(stop_record->>'stop_type', stop_type),
          company_name = COALESCE(stop_record->>'company_name', company_name),
          address = COALESCE(stop_record->>'address', address),
          city = COALESCE(stop_record->>'city', city),
          state = COALESCE(stop_record->>'state', state),
          zip_code = COALESCE(stop_record->>'zip_code', zip_code),
          reference_number = COALESCE(stop_record->>'reference_number', reference_number),
          contact_name = COALESCE(stop_record->>'contact_name', contact_name),
          contact_phone = COALESCE(stop_record->>'contact_phone', contact_phone),
          special_instructions = COALESCE(stop_record->>'special_instructions', special_instructions),
          scheduled_date = CASE 
            WHEN NULLIF(stop_record->>'scheduled_date', '') IS NOT NULL 
            THEN (stop_record->>'scheduled_date')::DATE 
            ELSE scheduled_date 
          END,
          scheduled_time = CASE 
            WHEN NULLIF(stop_record->>'scheduled_time', '') IS NOT NULL 
            THEN (stop_record->>'scheduled_time')::TIME 
            ELSE scheduled_time 
          END,
          updated_at = now()
        WHERE id = (stop_record->>'id')::UUID;
      ELSE
        -- Create new stop
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
          (stop_record->>'stop_number')::INTEGER,
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
          CASE 
            WHEN NULLIF(stop_record->>'scheduled_time', '') IS NOT NULL 
            THEN (stop_record->>'scheduled_time')::TIME 
            ELSE NULL 
          END,
          NULLIF((stop_record->>'actual_date'), '')::DATE
        );
      END IF;
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
$function$;