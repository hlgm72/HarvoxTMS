-- Fix scheduled_time type mismatch error
-- The issue is that load_stops.scheduled_time expects time type but we're passing text

-- Update the simple_load_operation_with_deductions function to properly handle time fields
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type TEXT,
  load_data JSONB,
  stops_data JSONB DEFAULT NULL,
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
  result_load RECORD;
  target_payment_period_id UUID;
  target_driver_user_id UUID;
  stop_record JSONB;
  new_load_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract driver user ID for recalculation
  target_driver_user_id := (load_data->>'driver_user_id')::UUID;

  -- Get company from user roles
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = current_user_id
  AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_IN_COMPANY';
  END IF;

  -- For new loads, ensure payment period exists
  IF operation_type = 'CREATE' AND target_driver_user_id IS NOT NULL THEN
    target_payment_period_id := create_payment_period_if_needed(
      target_company_id, 
      COALESCE((load_data->>'delivery_date')::DATE, CURRENT_DATE)
    );
  ELSIF operation_type = 'UPDATE' THEN
    -- For existing loads, keep current period or find the right one
    SELECT payment_period_id INTO target_payment_period_id
    FROM loads
    WHERE id = load_id_param;
  END IF;

  -- Create or update load
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      company_id, load_number, po_number, client_id, client_contact_id,
      driver_user_id, internal_dispatcher_id, total_amount, commodity,
      weight_lbs, notes, currency, payment_period_id, created_by,
      factoring_percentage, dispatching_percentage, leasing_percentage,
      pickup_date, delivery_date
    ) VALUES (
      target_company_id,
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF(load_data->>'client_id', '')::UUID,
      NULLIF(load_data->>'client_contact_id', '')::UUID,
      target_driver_user_id,
      NULLIF(load_data->>'internal_dispatcher_id', '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::INTEGER,
      NULLIF(load_data->>'notes', ''),
      'USD',
      target_payment_period_id,
      current_user_id,
      (load_data->>'factoring_percentage')::NUMERIC,
      (load_data->>'dispatching_percentage')::NUMERIC,
      (load_data->>'leasing_percentage')::NUMERIC,
      COALESCE((load_data->>'pickup_date')::DATE, CURRENT_DATE),
      COALESCE((load_data->>'delivery_date')::DATE, CURRENT_DATE)
    ) RETURNING * INTO result_load;
    
    new_load_id := result_load.id;
  ELSE
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::INTEGER, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes', ''), notes),
      driver_user_id = COALESCE(target_driver_user_id, driver_user_id),
      internal_dispatcher_id = COALESCE(NULLIF(load_data->>'internal_dispatcher_id', '')::UUID, internal_dispatcher_id),
      client_id = COALESCE(NULLIF(load_data->>'client_id', '')::UUID, client_id),
      client_contact_id = COALESCE(NULLIF(load_data->>'client_contact_id', '')::UUID, client_contact_id),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      updated_at = now()
    WHERE id = load_id_param
    RETURNING * INTO result_load;
    
    new_load_id := load_id_param;
  END IF;

  -- Handle stops data if provided
  IF stops_data IS NOT NULL THEN
    -- Delete existing stops for updates
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = new_load_id;
    END IF;

    -- Process each stop
    FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data)
    LOOP
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
        scheduled_time,  -- ✅ FIX: Properly handle time fields
        reference_number,
        contact_name,
        contact_phone,
        special_instructions,
        pickup_timezone,
        delivery_timezone
      ) VALUES (
        new_load_id,
        (stop_record->>'stop_number')::INTEGER,
        stop_record->>'stop_type',
        stop_record->>'company_name',
        stop_record->>'address',
        stop_record->>'city',
        stop_record->>'state',
        stop_record->>'zip_code',
        NULLIF(stop_record->>'scheduled_date', '')::DATE,
        -- ✅ CRITICAL FIX: Handle scheduled_time properly
        CASE 
          WHEN stop_record->>'scheduled_time' IS NULL OR stop_record->>'scheduled_time' = '' 
          THEN NULL 
          ELSE (stop_record->>'scheduled_time')::TIME 
        END,
        NULLIF(stop_record->>'reference_number', ''),
        NULLIF(stop_record->>'contact_name', ''),
        NULLIF(stop_record->>'contact_phone', ''),
        NULLIF(stop_record->>'special_instructions', ''),
        COALESCE(stop_record->>'pickup_timezone', 'America/New_York'),
        COALESCE(stop_record->>'delivery_timezone', 'America/New_York')
      );
    END LOOP;
  END IF;

  -- 🚀 RECÁLCULO OPTIMIZADO: Solo si hay conductor asignado, usar v3
  IF target_driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    -- Usar la función v3 optimizada que no causa timeout
    PERFORM auto_recalculate_driver_payment_period_v3(target_driver_user_id, target_payment_period_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_id', target_payment_period_id,
    'recalculation_triggered', target_driver_user_id IS NOT NULL,
    'processed_by', current_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;