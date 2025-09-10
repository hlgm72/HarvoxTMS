-- Fix percentage deductions recalculation when editing loads
-- This addresses the issue where editing a load doesn't update percentage deductions correctly

-- Function to clean up existing percentage deductions for a specific load
CREATE OR REPLACE FUNCTION public.cleanup_load_percentage_deductions(load_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete existing percentage deductions for this load
  DELETE FROM expense_instances 
  WHERE recurring_template_id IN (
    SELECT rt.id 
    FROM recurring_expense_templates rt 
    JOIN expense_types et ON rt.expense_type_id = et.id
    WHERE et.category = 'percentage_deduction'
  )
  AND notes LIKE '%Load #' || (SELECT load_number FROM loads WHERE id = load_id_param) || '%';
  
  -- Alternative cleanup by description patterns for automatic deductions
  DELETE FROM expense_instances 
  WHERE user_id IN (
    SELECT driver_user_id FROM loads WHERE id = load_id_param
  )
  AND description IN ('Leasing fees', 'Factoring fees', 'Dispatching fees')
  AND notes LIKE '%Load #%'
  AND created_at >= (SELECT created_at FROM loads WHERE id = load_id_param) - INTERVAL '1 day';
END;
$function$;

-- Enhanced function to create percentage deductions with proper cleanup
CREATE OR REPLACE FUNCTION public.create_percentage_deductions_for_load(
  load_id_param uuid, 
  driver_user_id_param uuid, 
  target_payment_period_id uuid,
  total_amount_param numeric,
  load_number_param text,
  is_update_mode boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_record RECORD;
  template_record RECORD;
  deduction_amount NUMERIC;
  created_deductions JSONB[] := '{}';
  deduction_result JSONB;
BEGIN
  -- If this is an update, first clean up existing percentage deductions
  IF is_update_mode THEN
    PERFORM cleanup_load_percentage_deductions(load_id_param);
  END IF;

  -- Get company settings for the driver
  SELECT c.* INTO company_record
  FROM companies c
  JOIN user_company_roles ucr ON c.id = ucr.company_id
  WHERE ucr.user_id = driver_user_id_param
    AND ucr.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No company found for driver';
  END IF;

  -- Create percentage-based deductions
  FOR template_record IN 
    SELECT rt.*, et.name as expense_type_name, et.category
    FROM recurring_expense_templates rt
    JOIN expense_types et ON rt.expense_type_id = et.id
    WHERE rt.user_id = driver_user_id_param
      AND rt.is_active = true
      AND et.category = 'percentage_deduction'
  LOOP
    -- Calculate deduction amount based on percentage
    deduction_amount := (total_amount_param * template_record.percentage / 100);
    
    -- Create the expense instance with proper conflict handling
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      user_id,
      amount,
      description,
      recurring_template_id,
      status,
      applied_at,
      applied_by,
      notes,
      expense_date,
      priority,
      is_critical
    ) VALUES (
      target_payment_period_id,
      template_record.expense_type_id,
      driver_user_id_param,
      deduction_amount,
      template_record.expense_type_name || ' fees',
      template_record.id,
      'applied',
      now(),
      auth.uid(),
      'Auto-generated percentage deduction for Load #' || load_number_param || ' (' || template_record.percentage || '%)',
      CURRENT_DATE,
      COALESCE(template_record.priority, 5),
      COALESCE(template_record.is_critical, false)
    )
    ON CONFLICT (payment_period_id, expense_type_id, user_id, recurring_template_id) 
    DO UPDATE SET
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      notes = EXCLUDED.notes,
      updated_at = now();

    -- Track created deduction
    created_deductions := created_deductions || jsonb_build_object(
      'expense_type', template_record.expense_type_name,
      'percentage', template_record.percentage,
      'amount', deduction_amount
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'deductions_created', array_length(created_deductions, 1),
    'deductions', created_deductions,
    'load_id', load_id_param,
    'payment_period_id', target_payment_period_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creating percentage deductions: %', SQLERRM;
END;
$function$;

-- Update the main load operation function to properly handle deduction updates
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type text, 
  load_data jsonb, 
  stops_data jsonb[] DEFAULT '{}'::jsonb[], 
  load_id_param uuid DEFAULT NULL::uuid
)
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
  percentage_deductions_result JSONB;
  load_total_amount NUMERIC;
  load_number_text TEXT;
  is_update_operation BOOLEAN;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Determine if this is an update operation
  is_update_operation := (operation_type = 'UPDATE' OR load_id_param IS NOT NULL);

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

  -- Ensure payment period exists if we have a pickup date and driver
  IF load_pickup_date IS NOT NULL AND (load_data->>'driver_user_id')::UUID IS NOT NULL THEN
    payment_period_id_result := create_payment_period_if_needed(target_company_id, load_pickup_date);
  END IF;

  -- Get total amount and load number for percentage calculations
  load_total_amount := COALESCE((load_data->>'total_amount')::NUMERIC, 0);
  
  -- Create or update the load
  IF operation_type = 'CREATE' OR load_id_param IS NULL THEN
    INSERT INTO loads (
      load_number,
      driver_user_id,
      pickup_date,
      delivery_date,
      total_amount,
      customer_rate,
      broker_name,
      pickup_city,
      pickup_state,
      delivery_city,
      delivery_state,
      status,
      notes,
      payment_period_id,
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'pickup_date'), '')::DATE,
      NULLIF((load_data->>'delivery_date'), '')::DATE,
      load_total_amount,
      NULLIF((load_data->>'customer_rate'), '')::NUMERIC,
      load_data->>'broker_name',
      load_data->>'pickup_city',
      load_data->>'pickup_state',
      load_data->>'delivery_city',
      load_data->>'delivery_state',
      load_status,
      load_data->>'notes',
      payment_period_id_result,
      current_user_id
    ) RETURNING *, load_number INTO result_load, load_number_text;
  ELSE
    -- Update existing load
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      pickup_date = COALESCE(NULLIF((load_data->>'pickup_date'), '')::DATE, pickup_date),
      delivery_date = COALESCE(NULLIF((load_data->>'delivery_date'), '')::DATE, delivery_date),
      total_amount = COALESCE(load_total_amount, total_amount),
      customer_rate = COALESCE(NULLIF((load_data->>'customer_rate'), '')::NUMERIC, customer_rate),
      broker_name = COALESCE(load_data->>'broker_name', broker_name),
      pickup_city = COALESCE(load_data->>'pickup_city', pickup_city),
      pickup_state = COALESCE(load_data->>'pickup_state', pickup_state),
      delivery_city = COALESCE(load_data->>'delivery_city', delivery_city),
      delivery_state = COALESCE(load_data->>'delivery_state', delivery_state),
      status = COALESCE(load_status, status),
      notes = COALESCE(load_data->>'notes', notes),
      payment_period_id = COALESCE(payment_period_id_result, payment_period_id),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING *, load_number INTO result_load, load_number_text;
  END IF;

  -- Process stops if provided
  IF array_length(stops_data, 1) > 0 THEN
    -- Delete existing stops for updates
    IF is_update_operation THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;
    
    FOR stop_data IN SELECT unnest(stops_data) LOOP
      INSERT INTO load_stops (
        load_id,
        stop_type,
        facility_name,
        address,
        city,
        state,
        zip_code,
        scheduled_date,
        scheduled_time,
        actual_date,
        actual_time,
        notes,
        contact_name,
        contact_phone
      ) VALUES (
        result_load.id,
        stop_data->>'stop_type',
        stop_data->>'facility_name',
        stop_data->>'address',
        stop_data->>'city',
        stop_data->>'state',
        stop_data->>'zip_code',
        NULLIF((stop_data->>'scheduled_date'), '')::DATE,
        NULLIF((stop_data->>'scheduled_time'), '')::TIME,
        NULLIF((stop_data->>'actual_date'), '')::DATE,
        NULLIF((stop_data->>'actual_time'), '')::TIME,
        stop_data->>'notes',
        stop_data->>'contact_name',
        stop_data->>'contact_phone'
      ) RETURNING row_to_json(load_stops.*) INTO stop_result;
      
      result_stops := result_stops || stop_result;
    END LOOP;
  END IF;

  -- 🚨 CRITICAL FIX: Create percentage deductions if driver is assigned and we have amount
  IF result_load.driver_user_id IS NOT NULL 
     AND load_total_amount > 0 
     AND payment_period_id_result IS NOT NULL THEN
    
    -- Get the correct driver period calculation ID
    SELECT dpc.id INTO payment_period_id_result
    FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = result_load.driver_user_id
      AND dpc.company_payment_period_id = payment_period_id_result;
    
    IF payment_period_id_result IS NOT NULL THEN
      SELECT create_percentage_deductions_for_load(
        result_load.id,
        result_load.driver_user_id,
        payment_period_id_result,
        load_total_amount,
        load_number_text,
        is_update_operation  -- Pass the update mode flag
      ) INTO percentage_deductions_result;
    END IF;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'stops', result_stops,
    'percentage_deductions', percentage_deductions_result,
    'payment_period_created', payment_period_id_result IS NOT NULL,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;