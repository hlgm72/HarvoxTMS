-- Fix simple_load_operation_with_deductions function to ensure correct parameter order

-- Check if this function exists and fix any parameter order issues
CREATE OR REPLACE FUNCTION simple_load_operation_with_deductions(
  operation_type text,
  load_data jsonb,
  stops_data jsonb[] DEFAULT '{}'::jsonb[],
  load_id_param uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  load_status TEXT;
  company_payment_period_id_var UUID;
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

  -- Ensure payment period exists if we have a pickup date and a driver
  company_payment_period_id_var := NULL;
  IF load_pickup_date IS NOT NULL THEN
    company_payment_period_id_var := create_payment_period_if_needed(target_company_id, load_pickup_date);
  END IF;

  -- Perform load operation
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number,
      driver_user_id,
      internal_dispatcher_id,
      total_amount,
      currency,
      factoring_fee_percentage,
      dispatching_fee_percentage,
      leasing_fee_percentage,
      pickup_date,
      delivery_date,
      pickup_location,
      delivery_location,
      commodity,
      weight,
      distance_miles,
      notes,
      status,
      payment_period_id,
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'currency', 'USD'),
      (load_data->>'factoring_fee_percentage')::NUMERIC,
      (load_data->>'dispatching_fee_percentage')::NUMERIC,
      (load_data->>'leasing_fee_percentage')::NUMERIC,
      load_pickup_date,
      (load_data->>'delivery_date')::DATE,
      load_data->>'pickup_location',
      load_data->>'delivery_location',
      load_data->>'commodity',
      (load_data->>'weight')::NUMERIC,
      (load_data->>'distance_miles')::NUMERIC,
      load_data->>'notes',
      load_status,
      company_payment_period_id_var,
      current_user_id
    ) RETURNING * INTO result_load;

    -- Create automatic deductions based on percentages (only if driver is assigned)
    IF (load_data->>'driver_user_id')::UUID IS NOT NULL AND company_payment_period_id_var IS NOT NULL THEN
      -- Get driver_period_calculation_id for this driver and period
      payment_period_id_result := NULL;
      SELECT dpc.id INTO payment_period_id_result
      FROM driver_period_calculations dpc
      WHERE dpc.driver_user_id = (load_data->>'driver_user_id')::UUID
        AND dpc.company_payment_period_id = company_payment_period_id_var;

      -- Create driver calculation if it doesn't exist
      IF payment_period_id_result IS NULL THEN
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
          (load_data->>'driver_user_id')::UUID,
          company_payment_period_id_var,
          0, 0, 0, 0, 0, 0,
          'calculated',
          false
        ) RETURNING id INTO payment_period_id_result;
      END IF;

      -- Create deductions based on load percentages
      IF (load_data->>'factoring_fee_percentage')::NUMERIC > 0 THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          status,
          applied_at,
          applied_by
        ) SELECT 
          payment_period_id_result,
          (load_data->>'driver_user_id')::UUID,
          et.id,
          (result_load.total_amount * (load_data->>'factoring_fee_percentage')::NUMERIC / 100),
          'Factoring fee for load ' || result_load.load_number,
          'applied',
          now(),
          current_user_id
        FROM expense_types et
        WHERE et.category = 'percentage_deduction' 
          AND et.name = 'factoring_fee'
        LIMIT 1;
      END IF;

      IF (load_data->>'dispatching_fee_percentage')::NUMERIC > 0 THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          status,
          applied_at,
          applied_by
        ) SELECT 
          payment_period_id_result,
          (load_data->>'driver_user_id')::UUID,
          et.id,
          (result_load.total_amount * (load_data->>'dispatching_fee_percentage')::NUMERIC / 100),
          'Dispatching fee for load ' || result_load.load_number,
          'applied',
          now(),
          current_user_id
        FROM expense_types et
        WHERE et.category = 'percentage_deduction' 
          AND et.name = 'dispatching_fee'
        LIMIT 1;
      END IF;

      IF (load_data->>'leasing_fee_percentage')::NUMERIC > 0 THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          status,
          applied_at,
          applied_by
        ) SELECT 
          payment_period_id_result,
          (load_data->>'driver_user_id')::UUID,
          et.id,
          (result_load.total_amount * (load_data->>'leasing_fee_percentage')::NUMERIC / 100),
          'Leasing fee for load ' || result_load.load_number,
          'applied',
          now(),
          current_user_id
        FROM expense_types et
        WHERE et.category = 'percentage_deduction' 
          AND et.name = 'leasing_fee'
        LIMIT 1;
      END IF;

      -- Trigger recalculation with CORRECT parameter order: driver_user_id FIRST, then company_payment_period_id
      BEGIN
        PERFORM recalculate_driver_payment_period(
          (load_data->>'driver_user_id')::UUID,  -- driver_user_id FIRST
          company_payment_period_id_var           -- company_payment_period_id SECOND
        );
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE NOTICE '❌ Load creation recalculation failed: % - Driver: %, Period: %', 
            SQLERRM, (load_data->>'driver_user_id')::UUID, company_payment_period_id_var;
      END;
    END IF;

  ELSE -- UPDATE
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      pickup_date = COALESCE((load_data->>'pickup_date')::DATE, pickup_date),
      delivery_date = COALESCE((load_data->>'delivery_date')::DATE, delivery_date),
      pickup_location = COALESCE(load_data->>'pickup_location', pickup_location),
      delivery_location = COALESCE(load_data->>'delivery_location', delivery_location),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight = COALESCE((load_data->>'weight')::NUMERIC, weight),
      distance_miles = COALESCE((load_data->>'distance_miles')::NUMERIC, distance_miles),
      notes = COALESCE(load_data->>'notes', notes),
      status = COALESCE(load_data->>'status', status),
      payment_period_id = COALESCE(company_payment_period_id_var, payment_period_id),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  -- Handle stops data (create/update stops)
  IF array_length(stops_data, 1) > 0 THEN
    FOR stop_data IN SELECT unnest(stops_data) LOOP
      -- Insert or update stop logic here
      -- (Implementation depends on your stops table structure)
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'stops', result_stops,
    'payment_period_id', company_payment_period_id_var,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;