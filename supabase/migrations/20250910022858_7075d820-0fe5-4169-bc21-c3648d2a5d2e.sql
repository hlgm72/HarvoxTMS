-- Fix scheduled_time data type casting in load_stops
-- Convert text to TIME type properly

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
  input_load_id UUID := load_id;
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
  operation_type := CASE WHEN input_load_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- For UPDATE operations, get the old payment period for comparison
  IF operation_type = 'UPDATE' THEN
    SELECT l.payment_period_id INTO old_payment_period_id
    FROM loads l 
    WHERE l.id = input_load_id;
  END IF;

  -- Create payment period if needed using the company_id and target date
  target_payment_period_id := create_payment_period_if_needed(target_company_id, target_load_date);

  -- Validate permissions through existing load or user company role
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      JOIN company_payment_periods cpp ON l.payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE l.id = input_load_id
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

  -- Create or update load (using only existing columns)
  IF operation_type = 'CREATE' THEN
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
      (load_data->>'driver_user_id')::UUID,
      (load_data->>'pickup_date')::DATE,
      (load_data->>'delivery_date')::DATE,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::INTEGER,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'status', 'dispatched'),
      (load_data->>'internal_dispatcher_id')::UUID,
      load_data->>'po_number',
      load_data->>'customer_name',
      (load_data->>'client_id')::UUID,
      (load_data->>'client_contact_id')::UUID,
      (load_data->>'dispatching_percentage')::NUMERIC,
      (load_data->>'factoring_percentage')::NUMERIC,
      (load_data->>'leasing_percentage')::NUMERIC,
      target_payment_period_id,
      load_data->>'notes',
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads l SET
      load_number = COALESCE(load_data->>'load_number', l.load_number),
      driver_user_id = COALESCE((load_data->>'driver_user_id')::UUID, l.driver_user_id),
      pickup_date = COALESCE((load_data->>'pickup_date')::DATE, l.pickup_date),
      delivery_date = COALESCE((load_data->>'delivery_date')::DATE, l.delivery_date),
      commodity = COALESCE(load_data->>'commodity', l.commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::INTEGER, l.weight_lbs),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, l.total_amount),
      status = COALESCE(load_data->>'status', l.status),
      internal_dispatcher_id = COALESCE((load_data->>'internal_dispatcher_id')::UUID, l.internal_dispatcher_id),
      po_number = COALESCE(load_data->>'po_number', l.po_number),
      customer_name = COALESCE(load_data->>'customer_name', l.customer_name),
      client_id = COALESCE((load_data->>'client_id')::UUID, l.client_id),
      client_contact_id = COALESCE((load_data->>'client_contact_id')::UUID, l.client_contact_id),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, l.dispatching_percentage),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, l.factoring_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, l.leasing_percentage),
      payment_period_id = target_payment_period_id,
      notes = COALESCE(load_data->>'notes', l.notes),
      updated_at = now()
    WHERE l.id = input_load_id
    RETURNING * INTO result_load;
  END IF;

  -- Handle stops if provided
  IF jsonb_array_length(stops_data) > 0 THEN
    -- Delete existing stops for update operation
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops ls WHERE ls.load_id = input_load_id;
    END IF;

    -- Insert new stops with proper type casting
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
        scheduled_time,
        contact_phone,
        contact_name,
        special_instructions,
        reference_number
      ) VALUES (
        result_load.id,
        (stop_record->>'stop_number')::INTEGER,
        stop_record->>'stop_type',
        stop_record->>'company_name',
        stop_record->>'address',
        stop_record->>'city',
        stop_record->>'state',
        stop_record->>'zip_code',
        (stop_record->>'scheduled_date')::DATE,
        CASE 
          WHEN NULLIF(stop_record->>'scheduled_time', '') IS NOT NULL 
          THEN (stop_record->>'scheduled_time')::TIME 
          ELSE NULL 
        END,
        stop_record->>'contact_phone',
        stop_record->>'contact_name',
        stop_record->>'special_instructions',
        stop_record->>'reference_number'
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