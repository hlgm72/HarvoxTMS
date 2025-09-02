-- Fix the null payment_period_id issue in simple_load_operation_with_deductions
-- Add proper validation and error handling

CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(operation_type text, load_data jsonb, stops_data jsonb[] DEFAULT '{}'::jsonb[], load_id_param uuid DEFAULT NULL::uuid)
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

  -- FIXED: Handle payment period creation with proper validation
  IF load_pickup_date IS NOT NULL THEN
    -- Try to create payment period, but handle when it returns NULL
    payment_period_id_result := create_payment_period_if_needed(
      target_company_id, 
      load_pickup_date,
      (load_data->>'driver_user_id')::UUID
    );
    
    -- If period creation failed (returns NULL), provide detailed error
    IF payment_period_id_result IS NULL THEN
      -- Check if date is too far in future
      IF load_pickup_date > CURRENT_DATE + INTERVAL '14 days' THEN
        RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Cannot create loads with pickup dates more than 14 days in the future. Pickup date: %, Max allowed: %', 
          load_pickup_date, CURRENT_DATE + INTERVAL '14 days';
      ELSE
        RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Could not create payment period for date %. This may be due to invalid company settings or date restrictions.', load_pickup_date;
      END IF;
    END IF;
  ELSE
    -- No pickup date provided - this is allowed for unassigned loads
    payment_period_id_result := NULL;
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
      client_id,
      customer_name,
      commodity,
      weight_lbs,
      notes,
      payment_period_id,
      pickup_date,
      delivery_date,
      status,
      client_contact_id,
      po_number,
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
      NULLIF((load_data->>'client_id'), '')::UUID,
      load_data->>'customer_name',
      load_data->>'commodity',
      NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      load_data->>'notes',
      payment_period_id_result,
      NULLIF((load_data->>'pickup_date'), '')::DATE,
      NULLIF((load_data->>'delivery_date'), '')::DATE,
      load_status,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      load_data->>'po_number',
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      internal_dispatcher_id = COALESCE(NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID, internal_dispatcher_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      currency = COALESCE(load_data->>'currency', currency),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      client_id = COALESCE(NULLIF((load_data->>'client_id'), '')::UUID, client_id),
      customer_name = COALESCE(load_data->>'customer_name', customer_name),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE(NULLIF((load_data->>'weight_lbs'), '')::INTEGER, weight_lbs),
      notes = COALESCE(load_data->>'notes', notes),
      payment_period_id = COALESCE(payment_period_id_result, payment_period_id),
      pickup_date = COALESCE(NULLIF((load_data->>'pickup_date'), '')::DATE, pickup_date),
      delivery_date = COALESCE(NULLIF((load_data->>'delivery_date'), '')::DATE, delivery_date),
      status = COALESCE(load_status, status),
      client_contact_id = COALESCE(NULLIF((load_data->>'client_contact_id'), '')::UUID, client_contact_id),
      po_number = COALESCE(load_data->>'po_number', po_number),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  -- Process stops
  IF array_length(stops_data, 1) > 0 THEN
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;

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
        scheduled_date,
        scheduled_time,
        actual_date,
        actual_time,
        reference_number,
        contact_name,
        contact_phone,
        special_instructions,
        created_at,
        updated_at
      ) VALUES (
        result_load.id,
        COALESCE((stop_data->>'stop_number')::INTEGER, 1),
        stop_data->>'stop_type',
        stop_data->>'company_name',
        stop_data->>'address',
        stop_data->>'city',
        stop_data->>'state',
        stop_data->>'zip_code',
        NULLIF((stop_data->>'scheduled_date'), '')::DATE,
        NULLIF((stop_data->>'scheduled_time'), '')::TIME,
        NULLIF((stop_data->>'actual_date'), '')::DATE,
        NULLIF((stop_data->>'actual_time'), '')::TIME,
        stop_data->>'reference_number',
        stop_data->>'contact_name',
        stop_data->>'contact_phone',
        stop_data->>'special_instructions',
        now(),
        now()
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

  -- Handle percentage deductions ONLY if driver is assigned AND we have a valid payment period
  IF result_load.driver_user_id IS NOT NULL AND payment_period_id_result IS NOT NULL THEN
    -- Get or create driver period calculation with explicit table aliases
    SELECT dpc.id INTO driver_calculation_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.driver_user_id = result_load.driver_user_id
    AND cpp.id = payment_period_id_result;

    -- CRITICAL FIX: Only create driver calculation if payment_period_id_result is NOT NULL
    IF driver_calculation_id IS NULL THEN
      INSERT INTO driver_period_calculations (
        driver_user_id,
        company_payment_period_id,  -- This is now guaranteed to be NOT NULL
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
        payment_period_id_result,  -- Guaranteed NOT NULL due to check above
        0, 0, 0, 0, 0, 0,
        'calculated',
        false
      ) RETURNING id INTO driver_calculation_id;
    END IF;

    -- Get expense type IDs for percentage deductions
    SELECT id INTO factoring_expense_type_id 
    FROM expense_types 
    WHERE name = 'Factoring Fee' AND category = 'percentage_deduction';
    
    SELECT id INTO dispatching_expense_type_id 
    FROM expense_types 
    WHERE name = 'Dispatching Fee' AND category = 'percentage_deduction';
    
    SELECT id INTO leasing_expense_type_id 
    FROM expense_types 
    WHERE name = 'Leasing Fee' AND category = 'percentage_deduction';

    -- Calculate amounts using the load's total_amount
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

    -- Update existing percentage deductions or create new ones
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
        'Factoring fees',
        result_load.pickup_date,
        'applied',
        now(),
        current_user_id
      )
      ON CONFLICT (payment_period_id, expense_type_id, user_id) 
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = 'Factoring fees',
        expense_date = EXCLUDED.expense_date,
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
        'Dispatching fees',
        result_load.pickup_date,
        'applied',
        now(),
        current_user_id
      )
      ON CONFLICT (payment_period_id, expense_type_id, user_id) 
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = 'Dispatching fees',
        expense_date = EXCLUDED.expense_date,
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
        'Leasing fees',
        result_load.pickup_date,
        'applied',
        now(),
        current_user_id
      )
      ON CONFLICT (payment_period_id, expense_type_id, user_id) 
      DO UPDATE SET
        amount = EXCLUDED.amount,
        description = 'Leasing fees',
        expense_date = EXCLUDED.expense_date,
        applied_at = now(),
        applied_by = current_user_id;
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