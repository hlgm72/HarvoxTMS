-- Fix create_payment_period_if_needed to prevent mass driver calculation creation
-- and add better validation and logging

-- First, update the create_payment_period_if_needed function to be more selective
CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(
  target_company_id UUID,
  target_date DATE,
  target_user_id UUID DEFAULT NULL
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_id UUID;
  existing_period_id UUID;
  period_start_date DATE;
  period_end_date DATE;
  frequency TEXT;
  cycle_start_day INTEGER;
  max_future_date DATE := CURRENT_DATE + INTERVAL '14 days'; -- Limit to 2 weeks
  driver_calc_id UUID;
BEGIN
  -- Enhanced logging with call stack
  RAISE LOG 'create_payment_period_if_needed: Called for company=%, date=%, user=%, stack=%', 
    target_company_id, target_date, target_user_id, 
    substring(current_query() from 1 for 200);

  -- CRITICAL VALIDATION: Prevent creation of periods too far in the future
  IF target_date > max_future_date THEN
    RAISE LOG 'create_payment_period_if_needed: BLOCKED - Date % is too far in future (limit: %)', 
      target_date, max_future_date;
    RETURN NULL;
  END IF;

  -- Get company payment settings
  SELECT 
    default_payment_frequency,
    payment_cycle_start_day
  INTO frequency, cycle_start_day
  FROM companies 
  WHERE id = target_company_id;

  IF NOT FOUND THEN
    RAISE LOG 'create_payment_period_if_needed: Company % not found', target_company_id;
    RETURN NULL;
  END IF;

  -- Calculate period boundaries based on frequency
  IF frequency = 'weekly' THEN
    period_start_date := target_date - (EXTRACT(DOW FROM target_date)::INTEGER - 1) * INTERVAL '1 day';
    period_end_date := period_start_date + INTERVAL '6 days';
  ELSIF frequency = 'biweekly' THEN
    -- Calculate biweekly periods
    period_start_date := target_date - ((target_date - DATE(EXTRACT(YEAR FROM target_date) || '-01-' || LPAD(cycle_start_day::text, 2, '0')))::INTEGER % 14) * INTERVAL '1 day';
    period_end_date := period_start_date + INTERVAL '13 days';
  ELSE -- monthly
    period_start_date := DATE_TRUNC('month', target_date)::DATE;
    period_end_date := (DATE_TRUNC('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  -- Check if period already exists
  SELECT id INTO existing_period_id
  FROM company_payment_periods cpp
  WHERE cpp.company_id = target_company_id
    AND cpp.period_start_date = period_start_date
    AND cpp.period_end_date = period_end_date;

  IF existing_period_id IS NOT NULL THEN
    RAISE LOG 'create_payment_period_if_needed: Using existing period % for company %', 
      existing_period_id, target_company_id;
    
    -- If a specific user is provided, ensure their driver calculation exists
    IF target_user_id IS NOT NULL THEN
      SELECT id INTO driver_calc_id
      FROM driver_period_calculations
      WHERE company_payment_period_id = existing_period_id
        AND driver_user_id = target_user_id;
      
      IF driver_calc_id IS NULL THEN
        INSERT INTO driver_period_calculations (
          driver_user_id,
          company_payment_period_id,
          gross_earnings, fuel_expenses, total_deductions,
          other_income, total_income, net_payment,
          payment_status, has_negative_balance
        ) VALUES (
          target_user_id, existing_period_id,
          0, 0, 0, 0, 0, 0, 'calculated', false
        ) RETURNING id INTO driver_calc_id;
        
        RAISE LOG 'create_payment_period_if_needed: Created driver calculation % for user % in existing period', 
          driver_calc_id, target_user_id;
      END IF;
    END IF;
    
    RETURN existing_period_id;
  END IF;

  -- Create the payment period
  INSERT INTO company_payment_periods (
    company_id,
    period_start_date,
    period_end_date,
    period_frequency,
    status
  ) VALUES (
    target_company_id,
    period_start_date,
    period_end_date,
    frequency,
    'open'
  ) RETURNING id INTO period_id;

  RAISE LOG 'create_payment_period_if_needed: Creating new period % for company %, dates: % - %',
    period_id, target_company_id, period_start_date, period_end_date;

  -- FIXED: Only create driver calculation for the specific user if provided
  -- DO NOT create calculations for all active drivers automatically
  IF target_user_id IS NOT NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings, fuel_expenses, total_deductions,
      other_income, total_income, net_payment,
      payment_status, has_negative_balance
    ) VALUES (
      target_user_id, period_id,
      0, 0, 0, 0, 0, 0, 'calculated', false
    ) RETURNING id INTO driver_calc_id;
    
    RAISE LOG 'create_payment_period_if_needed: Created driver calculation % for user % in new period',
      driver_calc_id, target_user_id;
  END IF;

  -- Generate recurring expenses for the period (but don't create driver calculations)
  PERFORM generate_recurring_expenses_for_period(period_id);

  RETURN period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'create_payment_period_if_needed: ERROR - %', SQLERRM;
  RETURN NULL;
END;
$function$;

-- Update simple_load_operation_with_deductions to pass the driver user ID
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

  -- FIXED: Pass the driver_user_id to create_payment_period_if_needed
  IF load_pickup_date IS NOT NULL THEN
    payment_period_id_result := create_payment_period_if_needed(
      target_company_id, 
      load_pickup_date,
      (load_data->>'driver_user_id')::UUID  -- Pass the specific driver user ID
    );
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

  -- Handle percentage deductions if driver is assigned
  IF result_load.driver_user_id IS NOT NULL THEN
    -- Get or create driver period calculation with explicit table aliases
    SELECT dpc.id INTO driver_calculation_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.driver_user_id = result_load.driver_user_id
    AND cpp.id = payment_period_id_result;

    IF driver_calculation_id IS NULL THEN
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
        payment_period_id_result,
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
    -- Fixed: Use (payment_period_id, expense_type_id, user_id) for conflict resolution
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