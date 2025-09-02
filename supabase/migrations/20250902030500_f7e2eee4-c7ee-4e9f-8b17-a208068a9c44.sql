-- Fix deduction descriptions to be generic instead of load-specific
-- Since deductions accumulate by period, they should have generic names

-- Update the simple_load_operation_with_deductions function to use generic descriptions
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type text,
  load_data jsonb,
  stops_data jsonb[] DEFAULT '{}'::jsonb[],
  load_id_param uuid DEFAULT NULL::uuid
) RETURNS jsonb
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
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  leasing_expense_type_id UUID;
  driver_period_calc_id UUID;
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

  -- Ensure payment period exists if we have a pickup date
  IF load_pickup_date IS NOT NULL THEN
    payment_period_id_result := create_payment_period_if_needed(target_company_id, load_pickup_date);
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
      pickup_date,
      delivery_date,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      customer,
      broker,
      commodity,
      weight,
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
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      load_pickup_date,
      (load_data->>'delivery_date')::DATE,
      load_data->>'origin_city',
      load_data->>'origin_state',
      load_data->>'destination_city',
      load_data->>'destination_state',
      load_data->>'customer',
      load_data->>'broker',
      load_data->>'commodity',
      (load_data->>'weight')::INTEGER,
      load_data->>'notes',
      load_status,
      payment_period_id_result,
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
      pickup_date = COALESCE(load_pickup_date, pickup_date),
      delivery_date = COALESCE((load_data->>'delivery_date')::DATE, delivery_date),
      origin_city = COALESCE(load_data->>'origin_city', origin_city),
      origin_state = COALESCE(load_data->>'origin_state', origin_state),
      destination_city = COALESCE(load_data->>'destination_city', destination_city),
      destination_state = COALESCE(load_data->>'destination_state', destination_state),
      customer = COALESCE(load_data->>'customer', customer),
      broker = COALESCE(load_data->>'broker', broker),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight = COALESCE((load_data->>'weight')::INTEGER, weight),
      notes = COALESCE(load_data->>'notes', notes),
      status = COALESCE(load_status, status),
      payment_period_id = COALESCE(payment_period_id_result, payment_period_id),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  -- Process stops if provided
  IF array_length(stops_data, 1) > 0 THEN
    FOR stop_data IN SELECT unnest(stops_data) LOOP
      IF operation_type = 'CREATE' OR (stop_data->>'id') IS NULL THEN
        -- Create new stop
        INSERT INTO load_stops (
          load_id,
          stop_order,
          stop_type,
          facility_name,
          address,
          city,
          state,
          zip_code,
          scheduled_date,
          scheduled_time,
          notes,
          reference_number
        ) VALUES (
          result_load.id,
          COALESCE((stop_data->>'stop_order')::INTEGER, 1),
          COALESCE(stop_data->>'stop_type', 'pickup'),
          stop_data->>'facility_name',
          stop_data->>'address',
          stop_data->>'city',
          stop_data->>'state',
          stop_data->>'zip_code',
          (stop_data->>'scheduled_date')::DATE,
          (stop_data->>'scheduled_time')::TIME,
          stop_data->>'notes',
          stop_data->>'reference_number'
        );
      ELSE
        -- Update existing stop
        UPDATE load_stops SET
          stop_order = COALESCE((stop_data->>'stop_order')::INTEGER, stop_order),
          stop_type = COALESCE(stop_data->>'stop_type', stop_type),
          facility_name = COALESCE(stop_data->>'facility_name', facility_name),
          address = COALESCE(stop_data->>'address', address),
          city = COALESCE(stop_data->>'city', city),
          state = COALESCE(stop_data->>'state', state),
          zip_code = COALESCE(stop_data->>'zip_code', zip_code),
          scheduled_date = COALESCE((stop_data->>'scheduled_date')::DATE, scheduled_date),
          scheduled_time = COALESCE((stop_data->>'scheduled_time')::TIME, scheduled_time),
          notes = COALESCE(stop_data->>'notes', notes),
          reference_number = COALESCE(stop_data->>'reference_number', reference_number),
          updated_at = now()
        WHERE id = (stop_data->>'id')::UUID;
      END IF;
    END LOOP;
  END IF;

  -- Create percentage deductions ONLY if driver is assigned
  IF result_load.driver_user_id IS NOT NULL THEN
    -- Get expense type IDs
    SELECT id INTO factoring_expense_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name = 'Factoring' LIMIT 1;
    SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name = 'Dispatching' LIMIT 1;
    SELECT id INTO leasing_expense_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name = 'Leasing' LIMIT 1;

    -- Get driver period calculation ID
    SELECT id INTO driver_period_calc_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.driver_user_id = result_load.driver_user_id
    AND cpp.id = payment_period_id_result
    LIMIT 1;

    IF driver_period_calc_id IS NOT NULL THEN
      -- FACTORING DEDUCTION (UPSERT)
      IF result_load.factoring_percentage > 0 AND factoring_expense_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          applied_by,
          applied_at,
          created_by
        ) VALUES (
          driver_period_calc_id,
          result_load.driver_user_id,
          factoring_expense_type_id,
          (result_load.total_amount * result_load.factoring_percentage / 100),
          'Factoring fees',
          load_pickup_date,
          'applied',
          current_user_id,
          now(),
          current_user_id
        )
        ON CONFLICT (payment_period_id, user_id, expense_type_id)
        DO UPDATE SET
          amount = expense_instances.amount + EXCLUDED.amount,
          updated_at = now();
      END IF;

      -- DISPATCHING DEDUCTION (UPSERT)
      IF result_load.dispatching_percentage > 0 AND dispatching_expense_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          applied_by,
          applied_at,
          created_by
        ) VALUES (
          driver_period_calc_id,
          result_load.driver_user_id,
          dispatching_expense_type_id,
          (result_load.total_amount * result_load.dispatching_percentage / 100),
          'Dispatching fees',
          load_pickup_date,
          'applied',
          current_user_id,
          now(),
          current_user_id
        )
        ON CONFLICT (payment_period_id, user_id, expense_type_id)
        DO UPDATE SET
          amount = expense_instances.amount + EXCLUDED.amount,
          updated_at = now();
      END IF;

      -- LEASING DEDUCTION (UPSERT)
      IF result_load.leasing_percentage > 0 AND leasing_expense_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          applied_by,
          applied_at,
          created_by
        ) VALUES (
          driver_period_calc_id,
          result_load.driver_user_id,
          leasing_expense_type_id,
          (result_load.total_amount * result_load.leasing_percentage / 100),
          'Leasing fees',
          load_pickup_date,
          'applied',
          current_user_id,
          now(),
          current_user_id
        )
        ON CONFLICT (payment_period_id, user_id, expense_type_id)
        DO UPDATE SET
          amount = expense_instances.amount + EXCLUDED.amount,
          updated_at = now();
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
    'payment_period_id', payment_period_id_result,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;