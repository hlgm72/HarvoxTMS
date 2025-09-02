-- FINAL FIX: Correct deduction calculation logic
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type text, 
  load_data jsonb, 
  stops_data jsonb[] DEFAULT '{}'::jsonb[], 
  load_id_param uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  driver_calculation_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  leasing_expense_type_id UUID;
  factoring_amount NUMERIC := 0;
  dispatching_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
  load_total_amount NUMERIC;
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
    IF NULLIF((load_data->>'driver_user_id'), '') IS NOT NULL THEN
      load_status := 'assigned';
    ELSE
      load_status := 'unassigned';
    END IF;
  END IF;

  -- Extract pickup date for payment period creation
  load_pickup_date := (load_data->>'pickup_date')::DATE;
  IF load_pickup_date IS NULL AND array_length(stops_data, 1) > 0 THEN
    FOR stop_data IN SELECT unnest(stops_data) LOOP
      IF stop_data->>'stop_type' = 'pickup' AND (stop_data->>'scheduled_date') IS NOT NULL THEN
        load_pickup_date := (stop_data->>'scheduled_date')::DATE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Ensure payment period exists if we have a pickup date and driver
  IF load_pickup_date IS NOT NULL AND (load_data->>'driver_user_id')::UUID IS NOT NULL THEN
    payment_period_id_result := create_payment_period_if_needed(
      target_company_id, 
      load_pickup_date, 
      (load_data->>'driver_user_id')::UUID
    );
  END IF;

  -- Perform load operation  
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number,
      driver_user_id,
      internal_dispatcher_id,
      client_id,
      total_amount,
      currency,
      commodity,
      weight_lbs,
      pickup_date,
      delivery_date,
      status,
      payment_period_id,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      notes,
      created_by,
      po_number
    ) VALUES (
      load_data->>'load_number',
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      NULLIF((load_data->>'client_id'), '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'currency', 'USD'),
      load_data->>'commodity',
      (load_data->>'weight_lbs')::NUMERIC,
      load_pickup_date,
      NULLIF((load_data->>'delivery_date'), '')::DATE,
      load_status,
      payment_period_id_result,
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      load_data->>'notes',
      current_user_id,
      load_data->>'po_number'
    ) RETURNING * INTO result_load;
  ELSE
    -- UPDATE operation
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      internal_dispatcher_id = COALESCE(NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID, internal_dispatcher_id),
      client_id = COALESCE(NULLIF((load_data->>'client_id'), '')::UUID, client_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      currency = COALESCE(load_data->>'currency', currency),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::NUMERIC, weight_lbs),
      pickup_date = COALESCE(load_pickup_date, pickup_date),
      delivery_date = COALESCE(NULLIF((load_data->>'delivery_date'), '')::DATE, delivery_date),
      status = COALESCE(load_status, status),
      payment_period_id = COALESCE(payment_period_id_result, payment_period_id),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      notes = COALESCE(load_data->>'notes', notes),
      po_number = COALESCE(load_data->>'po_number', po_number),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  -- Process stops
  IF array_length(stops_data, 1) > 0 THEN
    -- Delete existing stops for updates
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;

    -- Insert new stops
    FOR stop_data IN SELECT unnest(stops_data) LOOP
      INSERT INTO load_stops (
        load_id,
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
        stop_number,
        reference_number
      ) VALUES (
        result_load.id,
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
        COALESCE((stop_data->>'stop_number')::INTEGER, 1),
        stop_data->>'reference_number'
      ) RETURNING jsonb_build_object(
        'id', id,
        'stop_type', stop_type,
        'company_name', company_name,
        'city', city,
        'state', state
      ) INTO stop_result;
      
      result_stops := result_stops || stop_result;
    END LOOP;
  END IF;

  -- Handle percentage deductions only if driver is assigned and we have a payment period
  IF result_load.driver_user_id IS NOT NULL AND payment_period_id_result IS NOT NULL THEN
    -- Get driver calculation ID
    SELECT dpc.id INTO driver_calculation_id
    FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = result_load.driver_user_id
    AND dpc.company_payment_period_id = payment_period_id_result;

    -- If we have a calculation ID, create percentage deductions
    IF driver_calculation_id IS NOT NULL THEN
      -- Get expense type IDs for percentage deductions
      SELECT id INTO factoring_expense_type_id 
      FROM expense_types 
      WHERE LOWER(name) LIKE '%factoring%' AND category = 'percentage_deduction'
      LIMIT 1;
      
      SELECT id INTO dispatching_expense_type_id 
      FROM expense_types 
      WHERE LOWER(name) LIKE '%dispatch%' AND category = 'percentage_deduction'
      LIMIT 1;
      
      SELECT id INTO leasing_expense_type_id 
      FROM expense_types 
      WHERE LOWER(name) LIKE '%leas%' AND category = 'percentage_deduction'
      LIMIT 1;

      -- Calculate amounts for THIS load only
      load_total_amount := result_load.total_amount;
      
      IF result_load.factoring_percentage > 0 THEN
        factoring_amount := (load_total_amount * result_load.factoring_percentage / 100);
      END IF;
      
      IF result_load.dispatching_percentage > 0 THEN
        dispatching_amount := (load_total_amount * result_load.dispatching_percentage / 100);
      END IF;
      
      IF result_load.leasing_percentage > 0 THEN
        leasing_amount := (load_total_amount * result_load.leasing_percentage / 100);
      END IF;

      -- Create or update expense instances (FIXED: Proper accumulation logic)
      IF factoring_amount > 0 AND factoring_expense_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          applied_at,
          applied_by
        ) VALUES (
          driver_calculation_id,
          result_load.driver_user_id,
          factoring_expense_type_id,
          factoring_amount,
          'Factoring fee for load ' || result_load.load_number,
          result_load.pickup_date,
          'applied',
          now(),
          current_user_id
        )
        ON CONFLICT (payment_period_id, expense_type_id) 
        DO UPDATE SET
          -- CORRECT: Add this load's amount to the existing total
          amount = expense_instances.amount + EXCLUDED.amount,
          description = 'Factoring fees (multiple loads)',
          applied_at = now(),
          applied_by = current_user_id;
      END IF;

      IF dispatching_amount > 0 AND dispatching_expense_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          applied_at,
          applied_by
        ) VALUES (
          driver_calculation_id,
          result_load.driver_user_id,
          dispatching_expense_type_id,
          dispatching_amount,
          'Dispatching fee for load ' || result_load.load_number,
          result_load.pickup_date,
          'applied',
          now(),
          current_user_id
        )
        ON CONFLICT (payment_period_id, expense_type_id) 
        DO UPDATE SET
          -- CORRECT: Add this load's amount to the existing total
          amount = expense_instances.amount + EXCLUDED.amount,
          description = 'Dispatching fees (multiple loads)',
          applied_at = now(),
          applied_by = current_user_id;
      END IF;

      IF leasing_amount > 0 AND leasing_expense_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          applied_at,
          applied_by
        ) VALUES (
          driver_calculation_id,
          result_load.driver_user_id,
          leasing_expense_type_id,
          leasing_amount,
          'Leasing fee for load ' || result_load.load_number,
          result_load.pickup_date,
          'applied',
          now(),
          current_user_id
        )
        ON CONFLICT (payment_period_id, expense_type_id) 
        DO UPDATE SET
          -- CORRECT: Add this load's amount to the existing total
          amount = expense_instances.amount + EXCLUDED.amount,
          description = 'Leasing fees (multiple loads)',
          applied_at = now(),
          applied_by = current_user_id;
      END IF;
    END IF;
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
    'deductions_processed', jsonb_build_object(
      'factoring_amount', factoring_amount,
      'dispatching_amount', dispatching_amount,
      'leasing_amount', leasing_amount
    ),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;