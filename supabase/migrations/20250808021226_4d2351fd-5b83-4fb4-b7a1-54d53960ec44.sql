-- Fix load creation to automatically recalculate driver payment period

CREATE OR REPLACE FUNCTION public.create_or_update_load_with_validation(
  load_data jsonb,
  stops_data jsonb,
  load_id uuid DEFAULT NULL
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
  result_stops jsonb;
  operation_type TEXT;
  target_driver_id UUID;
  target_payment_period_id UUID;
  recalculation_result jsonb;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract company_id and driver_user_id from load_data
  target_company_id := (load_data->>'company_id')::UUID;
  target_driver_id := (load_data->>'driver_user_id')::UUID;
  target_payment_period_id := (load_data->>'payment_period_id')::UUID;
  
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id es requerido';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN load_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar cargas en esta empresa';
  END IF;

  -- For UPDATE operations, validate load exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      JOIN user_company_roles ucr ON l.company_id = ucr.company_id
      WHERE l.id = load_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Carga no encontrada o sin permisos para modificarla';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(load_data->>'load_number', '') IS NULL THEN
    RAISE EXCEPTION 'load_number es requerido';
  END IF;

  -- Check for duplicate load numbers within company (exclude current load if updating)
  IF EXISTS (
    SELECT 1 FROM loads
    WHERE company_id = target_company_id
    AND load_number = load_data->>'load_number'
    AND (load_id IS NULL OR id != load_id)
  ) THEN
    RAISE EXCEPTION 'Ya existe una carga con el número %', load_data->>'load_number';
  END IF;

  -- Validate payment period if provided
  IF target_payment_period_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM company_payment_periods
      WHERE id = target_payment_period_id
      AND company_id = target_company_id
    ) THEN
      RAISE EXCEPTION 'Período de pago no válido para esta empresa';
    END IF;
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE LOAD
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      company_id,
      load_number,
      po_number,
      client_id,
      driver_user_id,
      equipment_id,
      status,
      total_amount,
      driver_pay,
      priority,
      notes,
      pickup_date,
      delivery_date,
      leasing_percentage,
      factoring_percentage,
      dispatching_percentage,
      payment_period_id,
      created_by
    ) VALUES (
      target_company_id,
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF((load_data->>'client_id'), '')::UUID,
      target_driver_id,
      NULLIF((load_data->>'equipment_id'), '')::UUID,
      COALESCE(load_data->>'status', 'scheduled'),
      NULLIF((load_data->>'total_amount'), '')::NUMERIC,
      NULLIF((load_data->>'driver_pay'), '')::NUMERIC,
      COALESCE(load_data->>'priority', 'normal'),
      NULLIF(load_data->>'notes', ''),
      NULLIF((load_data->>'pickup_date'), '')::TIMESTAMP WITH TIME ZONE,
      NULLIF((load_data->>'delivery_date'), '')::TIMESTAMP WITH TIME ZONE,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      target_payment_period_id,
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      client_id = NULLIF((load_data->>'client_id'), '')::UUID,
      driver_user_id = COALESCE(target_driver_id, driver_user_id),
      equipment_id = NULLIF((load_data->>'equipment_id'), '')::UUID,
      status = COALESCE(load_data->>'status', status),
      total_amount = NULLIF((load_data->>'total_amount'), '')::NUMERIC,
      driver_pay = NULLIF((load_data->>'driver_pay'), '')::NUMERIC,
      priority = COALESCE(load_data->>'priority', priority),
      notes = NULLIF(load_data->>'notes', ''),
      pickup_date = NULLIF((load_data->>'pickup_date'), '')::TIMESTAMP WITH TIME ZONE,
      delivery_date = NULLIF((load_data->>'delivery_date'), '')::TIMESTAMP WITH TIME ZONE,
      leasing_percentage = NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      factoring_percentage = NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      dispatching_percentage = NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      payment_period_id = COALESCE(target_payment_period_id, payment_period_id),
      updated_at = now()
    WHERE id = load_id
    RETURNING * INTO result_load;
  END IF;

  -- ================================
  -- 4. HANDLE LOAD STOPS
  -- ================================
  
  IF stops_data IS NOT NULL AND jsonb_array_length(stops_data) > 0 THEN
    -- Delete existing stops if updating
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = load_id;
    END IF;

    -- Insert new stops
    INSERT INTO load_stops (
      load_id,
      stop_number,
      stop_type,
      address,
      city,
      state_id,
      zip_code,
      contact_name,
      contact_phone,
      appointment_time,
      notes,
      created_by
    )
    SELECT 
      result_load.id,
      (stop->>'stop_number')::INTEGER,
      stop->>'stop_type',
      stop->>'address',
      stop->>'city',
      (stop->>'state_id')::CHAR(2),
      stop->>'zip_code',
      NULLIF(stop->>'contact_name', ''),
      NULLIF(stop->>'contact_phone', ''),
      NULLIF((stop->>'appointment_time'), '')::TIMESTAMP WITH TIME ZONE,
      NULLIF(stop->>'notes', ''),
      current_user_id
    FROM jsonb_array_elements(stops_data) AS stop;

    -- Return stops data
    SELECT jsonb_agg(row_to_json(ls)) INTO result_stops
    FROM load_stops ls
    WHERE ls.load_id = result_load.id
    ORDER BY ls.stop_number;
  END IF;

  -- ================================
  -- 5. AUTO-RECALCULATE DRIVER PAYMENT PERIOD (NEW!)
  -- ================================
  
  -- If load has a driver and payment period, recalculate the driver's period
  IF target_driver_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    -- Find the driver's calculation record for this period
    DECLARE
      driver_calculation_id UUID;
    BEGIN
      SELECT id INTO driver_calculation_id
      FROM driver_period_calculations
      WHERE driver_user_id = target_driver_id
      AND company_payment_period_id = target_payment_period_id
      LIMIT 1;
      
      -- If calculation exists, recalculate it
      IF driver_calculation_id IS NOT NULL THEN
        SELECT calculate_driver_payment_period_with_validation(driver_calculation_id) 
        INTO recalculation_result;
        
        -- Log the recalculation result for debugging
        RAISE NOTICE 'Recálculo automático del período: %', recalculation_result;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail the entire operation if recalculation fails
      RAISE WARNING 'Error en recálculo automático del período: %', SQLERRM;
    END;
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
    'stops', COALESCE(result_stops, '[]'::jsonb),
    'auto_recalculation', recalculation_result,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de carga: %', SQLERRM;
END;
$function$;