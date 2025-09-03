-- ===============================================
-- 🚨 FIX CRÍTICO: Reparar simple_load_operation_with_deductions v7.0
-- ⚠️ CORREGIR ERRORES DE RECÁLCULO EN CARGAS
-- ===============================================

CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type TEXT,
  load_data JSONB,
  stops_data JSONB[] DEFAULT NULL,
  load_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  old_driver_user_id UUID;
  old_payment_period_id UUID;
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
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      pickup_date,
      delivery_date,
      commodity,
      weight_lbs,
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
      (load_data->>'factoring_percentage')::NUMERIC,
      (load_data->>'dispatching_percentage')::NUMERIC,
      (load_data->>'leasing_percentage')::NUMERIC,
      load_pickup_date,
      (load_data->>'delivery_date')::DATE,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::NUMERIC,
      load_data->>'notes',
      load_status,
      company_payment_period_id_var,
      current_user_id
    ) RETURNING * INTO result_load;

    RAISE NOTICE '✅ LOAD CREATED: ID % for driver % in period %', result_load.id, result_load.driver_user_id, company_payment_period_id_var;

    -- Trigger recalculation for CREATE operations
    IF result_load.driver_user_id IS NOT NULL AND company_payment_period_id_var IS NOT NULL THEN
      BEGIN
        RAISE NOTICE '🔄 Triggering recalculation for driver % in period %', result_load.driver_user_id, company_payment_period_id_var;
        PERFORM auto_recalculate_driver_payment_period_v2(
          result_load.driver_user_id,
          company_payment_period_id_var
        );
        RAISE NOTICE '✅ Recalculation completed for CREATE operation';
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE NOTICE '❌ CREATE recalculation failed: % - Driver: %, Period: %', 
            SQLERRM, result_load.driver_user_id, company_payment_period_id_var;
      END;
    END IF;

  ELSE -- UPDATE
    -- Get old values for comparison
    SELECT driver_user_id, payment_period_id INTO old_driver_user_id, old_payment_period_id
    FROM loads WHERE id = load_id_param;

    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      internal_dispatcher_id = COALESCE(NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID, internal_dispatcher_id),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      pickup_date = COALESCE((load_data->>'pickup_date')::DATE, pickup_date),
      delivery_date = COALESCE((load_data->>'delivery_date')::DATE, delivery_date),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::NUMERIC, weight_lbs),
      notes = COALESCE(load_data->>'notes', notes),
      status = COALESCE(load_data->>'status', status),
      payment_period_id = COALESCE(company_payment_period_id_var, payment_period_id),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;

    RAISE NOTICE '✅ LOAD UPDATED: ID % driver changed from % to %, period from % to %', 
      result_load.id, old_driver_user_id, result_load.driver_user_id, old_payment_period_id, result_load.payment_period_id;

    -- Trigger recalculation for UPDATE operations
    -- Recalculate old driver/period if changed
    IF old_driver_user_id IS NOT NULL AND old_payment_period_id IS NOT NULL AND 
       (old_driver_user_id != result_load.driver_user_id OR old_payment_period_id != result_load.payment_period_id) THEN
      BEGIN
        RAISE NOTICE '🔄 Recalculating OLD driver % in period % after reassignment', old_driver_user_id, old_payment_period_id;
        PERFORM auto_recalculate_driver_payment_period_v2(old_driver_user_id, old_payment_period_id);
        RAISE NOTICE '✅ Old driver recalculation completed';
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE NOTICE '❌ Old driver recalculation failed: %', SQLERRM;
      END;
    END IF;

    -- Recalculate new/current driver and period
    IF result_load.driver_user_id IS NOT NULL AND result_load.payment_period_id IS NOT NULL THEN
      BEGIN
        RAISE NOTICE '🔄 Recalculating CURRENT driver % in period % after update', result_load.driver_user_id, result_load.payment_period_id;
        PERFORM auto_recalculate_driver_payment_period_v2(
          result_load.driver_user_id,
          result_load.payment_period_id
        );
        RAISE NOTICE '✅ Current driver recalculation completed';
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE NOTICE '❌ Current driver recalculation failed: % - Driver: %, Period: %', 
            SQLERRM, result_load.driver_user_id, result_load.payment_period_id;
      END;
    END IF;
  END IF;

  -- Handle stops data creation/update
  IF array_length(stops_data, 1) > 0 THEN
    -- Delete existing stops for update operations
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = load_id_param;
    END IF;

    -- Insert new stops
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
        reference_number,
        contact_name,
        contact_phone,
        special_instructions,
        scheduled_date,
        scheduled_time,
        actual_date
      ) VALUES (
        result_load.id,
        (stop_data->>'stop_number')::INTEGER,
        stop_data->>'stop_type',
        stop_data->>'company_name',
        stop_data->>'address',
        stop_data->>'city',
        stop_data->>'state',
        stop_data->>'zip_code',
        stop_data->>'reference_number',
        stop_data->>'contact_name',
        stop_data->>'contact_phone',
        stop_data->>'special_instructions',
        (stop_data->>'scheduled_date')::DATE,
        stop_data->>'scheduled_time',
        (stop_data->>'actual_date')::DATE
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_id', company_payment_period_id_var,
    'recalculation_triggered', true,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;