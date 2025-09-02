-- COMPREHENSIVE LOAD MANAGEMENT SYSTEM REFACTOR
-- Fixing function conflicts and implementing modular approach

-- ============================================================================
-- STEP 1: Drop existing conflicting functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_payment_period_if_needed(uuid,date,uuid);
DROP FUNCTION IF EXISTS public.create_payment_period_if_needed(uuid,date);

-- ============================================================================
-- STEP 2: Create individual focused functions
-- ============================================================================

-- Function 1: Ensure payment period exists (clean version)
CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(
  target_company_id UUID,
  target_date DATE,
  target_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_period_id UUID;
  new_period_id UUID;
  period_start DATE;
  period_end DATE;
  driver_calculation_id UUID;
BEGIN
  -- Check for existing period that covers the target date
  SELECT id INTO existing_period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date <= target_date
    AND period_end_date >= target_date
    AND status IN ('open', 'processing')
  LIMIT 1;

  IF existing_period_id IS NOT NULL THEN
    RAISE LOG 'create_payment_period_if_needed: Using existing period % for company %', existing_period_id, target_company_id;
    
    -- Ensure driver calculation exists if user provided
    IF target_user_id IS NOT NULL THEN
      SELECT id INTO driver_calculation_id
      FROM driver_period_calculations
      WHERE driver_user_id = target_user_id
        AND company_payment_period_id = existing_period_id;
      
      IF driver_calculation_id IS NULL THEN
        INSERT INTO driver_period_calculations (
          driver_user_id, company_payment_period_id, gross_earnings, other_income,
          total_deductions, fuel_expenses, net_payment, total_income,
          has_negative_balance, payment_status
        ) VALUES (
          target_user_id, existing_period_id, 0, 0, 0, 0, 0, 0, false, 'calculated'
        );
      END IF;
    END IF;
    
    RETURN existing_period_id;
  END IF;

  -- Calculate period dates (weekly periods starting Monday)
  period_start := date_trunc('week', target_date)::DATE;
  period_end := (period_start + INTERVAL '6 days')::DATE;

  RAISE LOG 'create_payment_period_if_needed: Creating new period for company %, dates: % - %', target_company_id, period_start, period_end;

  -- Create new payment period
  INSERT INTO company_payment_periods (
    company_id, period_start_date, period_end_date, period_frequency,
    period_type, status, payment_date
  ) VALUES (
    target_company_id, period_start, period_end, 'weekly', 'regular', 'open',
    (period_end + INTERVAL '2 days')::DATE  -- Payment on Tuesday after period ends
  ) RETURNING id INTO new_period_id;

  -- Create driver calculation if user provided
  IF target_user_id IS NOT NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id, company_payment_period_id, gross_earnings, other_income,
      total_deductions, fuel_expenses, net_payment, total_income,
      has_negative_balance, payment_status
    ) VALUES (
      target_user_id, new_period_id, 0, 0, 0, 0, 0, 0, false, 'calculated'
    );
  END IF;

  RETURN new_period_id;
END;
$function$;

-- Function 2: Handle load basic operations
CREATE OR REPLACE FUNCTION public.create_or_update_load_basic(
  operation_type TEXT,
  load_data JSONB,
  load_id_param UUID DEFAULT NULL,
  payment_period_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_load RECORD;
  load_status TEXT;
  load_pickup_date DATE;
BEGIN
  -- Determine load status
  IF load_data->>'status' IS NOT NULL THEN
    load_status := load_data->>'status';
  ELSE
    IF NULLIF((load_data->>'driver_user_id'), '') IS NOT NULL THEN
      load_status := 'assigned';
    ELSE
      load_status := 'unassigned';
    END IF;
  END IF;

  -- Extract pickup date
  load_pickup_date := (load_data->>'pickup_date')::DATE;

  -- Perform load operation
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number, driver_user_id, internal_dispatcher_id, client_id, client_contact_id,
      total_amount, currency, commodity, weight_lbs, pickup_date, delivery_date,
      status, payment_period_id, factoring_percentage, dispatching_percentage,
      leasing_percentage, notes, created_by, po_number
    ) VALUES (
      load_data->>'load_number',
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      NULLIF((load_data->>'client_id'), '')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'currency', 'USD'),
      load_data->>'commodity',
      (load_data->>'weight_lbs')::NUMERIC,
      load_pickup_date,
      NULLIF((load_data->>'delivery_date'), '')::DATE,
      load_status,
      payment_period_id,
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      load_data->>'notes',
      auth.uid(),
      load_data->>'po_number'
    ) RETURNING * INTO result_load;
  ELSE
    -- UPDATE operation
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      client_id = COALESCE(NULLIF((load_data->>'client_id'), '')::UUID, client_id),
      client_contact_id = COALESCE(NULLIF((load_data->>'client_contact_id'), '')::UUID, client_contact_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::NUMERIC, weight_lbs),
      notes = COALESCE(load_data->>'notes', notes),
      po_number = COALESCE(load_data->>'po_number', po_number),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'load', row_to_json(result_load)
  );
END;
$function$;

-- Function 3: Handle load stops
CREATE OR REPLACE FUNCTION public.handle_load_stops(
  load_id UUID,
  stops_data JSONB[],
  operation_type TEXT
)
RETURNS JSONB[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_stops JSONB[] := '{}';
  stop_data JSONB;
  stop_result JSONB;
BEGIN
  -- Process stops if provided
  IF array_length(stops_data, 1) > 0 THEN
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = handle_load_stops.load_id;
    END IF;

    FOR stop_data IN SELECT unnest(stops_data) LOOP
      INSERT INTO load_stops (
        load_id, stop_type, company_name, address, city, state, zip_code,
        scheduled_date, scheduled_time, contact_name, contact_phone,
        special_instructions, stop_number, reference_number, actual_date
      ) VALUES (
        handle_load_stops.load_id,
        stop_data->>'stop_type',
        stop_data->>'company_name',
        stop_data->>'address',
        stop_data->>'city',
        stop_data->>'state',
        stop_data->>'zip_code',
        NULLIF((stop_data->>'scheduled_date'), '')::DATE,
        CASE 
          WHEN NULLIF(stop_data->>'scheduled_time', '') IS NOT NULL THEN 
            (stop_data->>'scheduled_time')::TIME
          ELSE NULL 
        END,
        stop_data->>'contact_name',
        stop_data->>'contact_phone',
        stop_data->>'special_instructions',
        (stop_data->>'stop_number')::INTEGER,
        stop_data->>'reference_number',
        NULLIF((stop_data->>'actual_date'), '')::DATE
      );

      stop_result := jsonb_build_object(
        'stop_type', stop_data->>'stop_type',
        'company_name', stop_data->>'company_name',
        'city', stop_data->>'city'
      );
      result_stops := result_stops || stop_result;
    END LOOP;
  END IF;

  RETURN result_stops;
END;
$function$;

-- Function 4: Apply automatic deductions (FIXED version)
CREATE OR REPLACE FUNCTION public.apply_automatic_deductions(
  driver_user_id UUID,
  payment_period_id UUID,
  load_total_amount NUMERIC,
  factoring_percentage NUMERIC DEFAULT 0,
  dispatching_percentage NUMERIC DEFAULT 0,
  leasing_percentage NUMERIC DEFAULT 0,
  load_pickup_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  driver_calculation_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  leasing_expense_type_id UUID;
  factoring_amount NUMERIC := 0;
  dispatching_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
BEGIN
  -- Skip if no driver or no load value
  IF driver_user_id IS NULL OR load_total_amount <= 0 THEN
    RETURN jsonb_build_object(
      'factoring_amount', 0,
      'dispatching_amount', 0,
      'leasing_amount', 0,
      'message', 'No deductions applied - no driver or zero load amount'
    );
  END IF;

  -- Find driver calculation record
  SELECT id INTO driver_calculation_id
  FROM driver_period_calculations
  WHERE driver_period_calculations.driver_user_id = apply_automatic_deductions.driver_user_id
    AND company_payment_period_id = apply_automatic_deductions.payment_period_id;

  IF driver_calculation_id IS NULL THEN
    RAISE EXCEPTION 'Driver calculation not found for driver % in period %', driver_user_id, payment_period_id;
  END IF;

  -- Get expense type IDs
  SELECT id INTO factoring_expense_type_id
  FROM expense_types
  WHERE name = 'Factoring Fee' AND category = 'percentage_deduction';

  SELECT id INTO dispatching_expense_type_id
  FROM expense_types
  WHERE name = 'Dispatching Fee' AND category = 'percentage_deduction';

  SELECT id INTO leasing_expense_type_id
  FROM expense_types
  WHERE name = 'Leasing Fee' AND category = 'percentage_deduction';

  -- Calculate deduction amounts
  factoring_amount := load_total_amount * COALESCE(factoring_percentage, 0) / 100;
  dispatching_amount := load_total_amount * COALESCE(dispatching_percentage, 0) / 100;
  leasing_amount := load_total_amount * COALESCE(leasing_percentage, 0) / 100;

  -- Apply factoring deduction
  IF factoring_expense_type_id IS NOT NULL AND factoring_amount > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id, user_id, expense_type_id, amount,
      description, expense_date, status, applied_at, applied_by,
      priority, is_critical, created_by
    ) VALUES (
      driver_calculation_id, apply_automatic_deductions.driver_user_id, factoring_expense_type_id,
      factoring_amount, 'Factoring fees', load_pickup_date,
      'applied', now(), auth.uid(), 5, false, auth.uid()
    )
    ON CONFLICT (payment_period_id, user_id, expense_type_id) 
    DO UPDATE SET 
      amount = expense_instances.amount + EXCLUDED.amount,
      updated_at = now();
  END IF;

  -- Apply dispatching deduction  
  IF dispatching_expense_type_id IS NOT NULL AND dispatching_amount > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id, user_id, expense_type_id, amount,
      description, expense_date, status, applied_at, applied_by,
      priority, is_critical, created_by
    ) VALUES (
      driver_calculation_id, apply_automatic_deductions.driver_user_id, dispatching_expense_type_id,
      dispatching_amount, 'Dispatching fees', load_pickup_date,
      'applied', now(), auth.uid(), 5, false, auth.uid()
    )
    ON CONFLICT (payment_period_id, user_id, expense_type_id) 
    DO UPDATE SET 
      amount = expense_instances.amount + EXCLUDED.amount,
      updated_at = now();
  END IF;

  -- Apply leasing deduction
  IF leasing_expense_type_id IS NOT NULL AND leasing_amount > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id, user_id, expense_type_id, amount,
      description, expense_date, status, applied_at, applied_by,
      priority, is_critical, created_by
    ) VALUES (
      driver_calculation_id, apply_automatic_deductions.driver_user_id, leasing_expense_type_id,
      leasing_amount, 'Leasing fees', load_pickup_date,
      'applied', now(), auth.uid(), 5, false, auth.uid()
    )
    ON CONFLICT (payment_period_id, user_id, expense_type_id) 
    DO UPDATE SET 
      amount = expense_instances.amount + EXCLUDED.amount,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'factoring_amount', factoring_amount,
    'dispatching_amount', dispatching_amount,
    'leasing_amount', leasing_amount,
    'driver_calculation_id', driver_calculation_id
  );
END;
$function$;

-- ============================================================================
-- STEP 3: Create the new simplified coordinator function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type TEXT, 
  load_data JSONB, 
  stops_data JSONB[] DEFAULT '{}', 
  load_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load JSONB;
  result_stops JSONB[];
  payment_period_id_result UUID;
  load_pickup_date DATE;
  deduction_result JSONB;
  final_load RECORD;
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

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
      AND company_id = target_company_id
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_LOADS';
  END IF;

  -- Extract pickup date
  load_pickup_date := (load_data->>'pickup_date')::DATE;
  IF load_pickup_date IS NULL AND array_length(stops_data, 1) > 0 THEN
    FOR i IN 1..array_length(stops_data, 1) LOOP
      IF stops_data[i]->>'stop_type' = 'pickup' AND (stops_data[i]->>'scheduled_date') IS NOT NULL THEN
        load_pickup_date := (stops_data[i]->>'scheduled_date')::DATE;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- STEP 1: Ensure payment period exists
  IF load_pickup_date IS NOT NULL AND (load_data->>'driver_user_id')::UUID IS NOT NULL THEN
    payment_period_id_result := create_payment_period_if_needed(
      target_company_id, 
      load_pickup_date, 
      (load_data->>'driver_user_id')::UUID
    );
  END IF;

  -- STEP 2: Create or update load
  result_load := create_or_update_load_basic(
    operation_type,
    load_data,
    load_id_param,
    payment_period_id_result
  );

  -- Get the actual load record for further processing
  IF operation_type = 'CREATE' THEN
    SELECT * INTO final_load FROM loads 
    WHERE id = (result_load->'load'->>'id')::UUID;
  ELSE
    SELECT * INTO final_load FROM loads WHERE id = load_id_param;
  END IF;

  -- STEP 3: Handle stops
  result_stops := handle_load_stops(
    final_load.id,
    stops_data,
    operation_type
  );

  -- STEP 4: Apply automatic deductions
  deduction_result := apply_automatic_deductions(
    (load_data->>'driver_user_id')::UUID,
    payment_period_id_result,
    (load_data->>'total_amount')::NUMERIC,
    COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
    COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
    COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
    COALESCE(load_pickup_date, CURRENT_DATE)
  );

  -- Return comprehensive result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'load', row_to_json(final_load),
    'stops', result_stops,
    'automatic_deductions', deduction_result,
    'payment_period_id', payment_period_id_result,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;