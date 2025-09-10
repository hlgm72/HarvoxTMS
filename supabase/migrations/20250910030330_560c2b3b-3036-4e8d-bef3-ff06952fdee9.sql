-- Agregar logging de debug más agresivo a la función RPC
-- para ver exactamente dónde está fallando

CREATE OR REPLACE FUNCTION simple_load_operation_with_deductions(load_data jsonb, stops_data jsonb DEFAULT '[]'::jsonb, load_id uuid DEFAULT NULL::uuid)
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
BEGIN
  -- DEBUG: Log start of function
  RAISE NOTICE '🚨 RPC DEBUG: ===== STARTING simple_load_operation_with_deductions =====';
  RAISE NOTICE '🚨 RPC DEBUG: load_data: %', load_data;
  RAISE NOTICE '🚨 RPC DEBUG: load_id: %', load_id;

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

  -- Calculate status based on driver assignment
  IF load_data->>'status' IS NOT NULL THEN
    calculated_status := load_data->>'status';
  ELSE
    -- Auto-calculate status based on driver assignment
    IF NULLIF((load_data->>'driver_user_id'), '') IS NOT NULL THEN
      calculated_status := 'assigned';  -- Has driver = assigned
    ELSE
      calculated_status := 'created';   -- No driver = created
    END IF;
  END IF;

  RAISE NOTICE '🚨 RPC DEBUG: calculated_status: %', calculated_status;
  RAISE NOTICE '🚨 RPC DEBUG: driver_user_id from load_data: %', load_data->>'driver_user_id';

  -- Create or update load (using only existing columns)
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
      (load_data->>'driver_user_id')::UUID,
      (load_data->>'pickup_date')::DATE,
      (load_data->>'delivery_date')::DATE,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::INTEGER,
      (load_data->>'total_amount')::NUMERIC,
      calculated_status,
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
    
    RAISE NOTICE '🚨 RPC DEBUG: Load inserted with ID: %', result_load.id;
  ELSE
    RAISE NOTICE '🚨 RPC DEBUG: About to UPDATE load with ID: %', input_load_id;
    
    -- For UPDATE: recalculate status if driver assignment changes
    IF load_data->>'status' IS NULL THEN
      -- Auto-calculate status for UPDATE if not explicitly set
      IF COALESCE((load_data->>'driver_user_id'), '') != '' THEN
        calculated_status := 'assigned';  -- Driver assigned = assigned
      ELSE
        -- Check if we're removing driver assignment
        SELECT CASE 
          WHEN l.driver_user_id IS NOT NULL THEN l.status  -- Keep existing status if had driver
          ELSE 'created'  -- Set to created if no driver
        END INTO calculated_status
        FROM loads l WHERE l.id = input_load_id;
      END IF;
    END IF;

    UPDATE loads l SET
      load_number = COALESCE(load_data->>'load_number', l.load_number),
      driver_user_id = COALESCE((load_data->>'driver_user_id')::UUID, l.driver_user_id),
      pickup_date = COALESCE((load_data->>'pickup_date')::DATE, l.pickup_date),
      delivery_date = COALESCE((load_data->>'delivery_date')::DATE, l.delivery_date),
      commodity = COALESCE(load_data->>'commodity', l.commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::INTEGER, l.weight_lbs),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, l.total_amount),
      status = COALESCE(load_data->>'status', calculated_status, l.status),
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
    
    RAISE NOTICE '🚨 RPC DEBUG: Load updated';
  END IF;

  -- Handle stops if provided
  IF jsonb_array_length(stops_data) > 0 THEN
    RAISE NOTICE '🚨 RPC DEBUG: Processing % stops', jsonb_array_length(stops_data);
    
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

  RAISE NOTICE '🚨 RPC DEBUG: About to check recalculation conditions';
  RAISE NOTICE '🚨 RPC DEBUG: result_load.driver_user_id: %', result_load.driver_user_id;
  RAISE NOTICE '🚨 RPC DEBUG: target_payment_period_id: %', target_payment_period_id;

  -- 🚨 CRITICAL FIX: Use correct functions with proper parameters for recalculation
  IF result_load.driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    RAISE NOTICE '🚨 RPC DEBUG: ✅ CONDITIONS MET - Starting driver period recalculation';
    
    BEGIN
      RAISE NOTICE '🚨 RPC DEBUG: Starting driver period recalculation - Driver: %, Period: %', 
        result_load.driver_user_id, target_payment_period_id;
      
      -- Ensure the driver period calculation exists with correct parameters
      SELECT ensure_driver_period_calculation_exists(
        result_load.driver_user_id,
        target_payment_period_id
      ) INTO calculation_id;
      
      RAISE NOTICE '🚨 RPC DEBUG: Calculation ID obtained: %', calculation_id;
      
      -- Now recalculate using the specific calculation_id
      IF calculation_id IS NOT NULL THEN
        SELECT calculate_driver_payment_no_auth(calculation_id) INTO calc_result;
        
        IF (calc_result->>'success')::boolean THEN
          RAISE NOTICE '🚨 RPC DEBUG: ✅ Driver period recalculated successfully - Net: $%', 
            calc_result->>'net_payment';
        ELSE
          RAISE NOTICE '🚨 RPC DEBUG: ❌ Error recalculating driver period: %', calc_result->>'error';
        END IF;
      ELSE
        RAISE NOTICE '🚨 RPC DEBUG: ❌ Failed to get calculation_id for driver period';
      END IF;

      -- If payment period changed during UPDATE, also recalculate old period
      IF operation_type = 'UPDATE' AND old_payment_period_id IS NOT NULL AND old_payment_period_id != target_payment_period_id THEN
        RAISE NOTICE '🚨 RPC DEBUG: Recalculating old period: %', old_payment_period_id;
        
        SELECT ensure_driver_period_calculation_exists(
          result_load.driver_user_id,
          old_payment_period_id
        ) INTO calculation_id;
        
        IF calculation_id IS NOT NULL THEN
          SELECT calculate_driver_payment_no_auth(calculation_id) INTO calc_result;
          RAISE NOTICE '🚨 RPC DEBUG: ✅ Old period recalculated after period change';
        END IF;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '🚨 RPC DEBUG: ⚠️ Driver recalculation error: %', SQLERRM;
      -- Don't fail the entire operation, just log the error
    END;
  ELSE
    RAISE NOTICE '🚨 RPC DEBUG: ❌ CONDITIONS NOT MET - Skipping recalculation';
    RAISE NOTICE '🚨 RPC DEBUG: Has driver: %, Has period: %', 
      result_load.driver_user_id IS NOT NULL, 
      target_payment_period_id IS NOT NULL;
  END IF;

  RAISE NOTICE '🚨 RPC DEBUG: ===== ENDING simple_load_operation_with_deductions =====';

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_id', target_payment_period_id,
    'old_payment_period_id', old_payment_period_id,
    'driver_recalculated', result_load.driver_user_id IS NOT NULL,
    'calculation_id', calculation_id,
    'status_calculated', calculated_status,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '🚨 RPC DEBUG: ❌ EXCEPTION: %', SQLERRM;
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;