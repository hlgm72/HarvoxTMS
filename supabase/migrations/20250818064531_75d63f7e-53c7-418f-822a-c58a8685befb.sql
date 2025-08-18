CREATE OR REPLACE FUNCTION public.simple_load_operation(load_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load RECORD;
  load_stops_data JSONB;
  stop_record JSONB;
  operation_type TEXT;
  load_id_param UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract company_id and operation type
  target_company_id := (load_data->>'company_id')::UUID;
  load_id_param := (load_data->>'id')::UUID;
  operation_type := CASE WHEN load_id_param IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

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

  -- ================================
  -- 2. MAIN LOAD OPERATION
  -- ================================
  IF operation_type = 'CREATE' THEN
    INSERT INTO public.loads (
      load_number,
      po_number,
      client_id,
      client_contact_id,
      internal_dispatcher_id,
      commodity,
      total_amount,
      driver_user_id,
      status,
      payment_period_id,
      created_by,
      weight_lbs,
      notes,
      customer_name,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF((load_data->>'client_id'), '')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      NULLIF(load_data->>'commodity', ''),
      NULLIF((load_data->>'total_amount'), '')::NUMERIC,
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      COALESCE(load_data->>'status', 'draft'),
      NULLIF((load_data->>'payment_period_id'), '')::UUID,
      current_user_id,
      NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      NULLIF(load_data->>'notes', ''),
      NULLIF(load_data->>'customer_name', ''),
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC
    ) RETURNING * INTO result_load;
  ELSE
    -- Update existing load
    UPDATE public.loads SET
      po_number = COALESCE(NULLIF(load_data->>'po_number', ''), po_number),
      client_id = COALESCE(NULLIF((load_data->>'client_id'), '')::UUID, client_id),
      client_contact_id = COALESCE(NULLIF((load_data->>'client_contact_id'), '')::UUID, client_contact_id),
      internal_dispatcher_id = COALESCE(NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID, internal_dispatcher_id),
      commodity = COALESCE(NULLIF(load_data->>'commodity', ''), commodity),
      total_amount = COALESCE(NULLIF((load_data->>'total_amount'), '')::NUMERIC, total_amount),
      driver_user_id = COALESCE(NULLIF((load_data->>'driver_user_id'), '')::UUID, driver_user_id),
      status = COALESCE(load_data->>'status', status),
      payment_period_id = COALESCE(NULLIF((load_data->>'payment_period_id'), '')::UUID, payment_period_id),
      updated_at = now(),
      weight_lbs = COALESCE(NULLIF((load_data->>'weight_lbs'), '')::INTEGER, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes', ''), notes),
      customer_name = COALESCE(NULLIF(load_data->>'customer_name', ''), customer_name),
      factoring_percentage = COALESCE(NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE(NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE(NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC, leasing_percentage)
    WHERE id = load_id_param
    RETURNING * INTO result_load;
  END IF;

  -- ================================
  -- 3. HANDLE LOAD STOPS
  -- ================================
  load_stops_data := load_data->'stops';
  
  IF load_stops_data IS NOT NULL THEN
    -- Clear existing stops for update operations
    IF operation_type = 'UPDATE' THEN
      DELETE FROM public.load_stops WHERE load_id = load_id_param;
    END IF;

    -- Insert new stops
    FOR stop_record IN SELECT * FROM jsonb_array_elements(load_stops_data)
    LOOP
      INSERT INTO public.load_stops (
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
        reference_number,
        contact_name,
        contact_phone,
        special_instructions
      ) VALUES (
        result_load.id,
        (stop_record->>'stop_number')::INTEGER,
        stop_record->>'stop_type',
        stop_record->>'company_name',
        NULLIF(stop_record->>'address', ''),
        NULLIF(stop_record->>'city', ''),
        NULLIF(stop_record->>'state', ''),
        NULLIF(stop_record->>'zip_code', ''),
        NULLIF((stop_record->>'scheduled_date'), '')::DATE,
        CASE 
          WHEN NULLIF(stop_record->>'scheduled_time', '') IS NOT NULL 
          THEN (NULLIF(stop_record->>'scheduled_time', ''))::TIME
          ELSE NULL
        END,
        NULLIF(stop_record->>'reference_number', ''),
        NULLIF(stop_record->>'contact_name', ''),
        NULLIF(stop_record->>'contact_phone', ''),
        NULLIF(stop_record->>'special_instructions', '')
      );
    END LOOP;
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
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$function$