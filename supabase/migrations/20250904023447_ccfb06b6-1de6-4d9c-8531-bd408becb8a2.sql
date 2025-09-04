-- Drop all versions of simple_load_operation_with_deductions function
DROP FUNCTION IF EXISTS public.simple_load_operation_with_deductions(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.simple_load_operation_with_deductions(text, jsonb, jsonb, uuid);
DROP FUNCTION IF EXISTS public.simple_load_operation_with_deductions(text, jsonb, jsonb[], uuid);

-- Create the final version matching the expected call signature
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type text,
  load_data jsonb,
  stops_data jsonb[],
  load_id_param uuid DEFAULT NULL
) RETURNS jsonb
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
  stop_data JSONB;
  result_stop RECORD;
  stops_created INTEGER := 0;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract driver user ID and payment period ID
  target_driver_user_id := (load_data->>'driver_user_id')::UUID;
  target_payment_period_id := (load_data->>'payment_period_id')::UUID;

  -- Get company from user roles for validation
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = current_user_id
  AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_IN_COMPANY';
  END IF;

  -- Validate user has permissions to create/edit loads
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_LOADS';
  END IF;

  -- Create or update load
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number, po_number, client_id, client_contact_id,
      driver_user_id, internal_dispatcher_id, total_amount, commodity,
      weight_lbs, notes, currency, payment_period_id, created_by,
      factoring_percentage, dispatching_percentage, leasing_percentage
    ) VALUES (
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
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 3),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 5),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 5)
    ) RETURNING * INTO result_load;
  ELSIF operation_type = 'UPDATE' THEN
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      po_number = COALESCE(NULLIF(load_data->>'po_number', ''), po_number),
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
  END IF;

  -- Handle stops data if provided
  IF stops_data IS NOT NULL AND array_length(stops_data, 1) > 0 THEN
    -- Delete existing stops for UPDATE operations
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;

    -- Insert new stops
    FOR stop_data IN SELECT * FROM unnest(stops_data) LOOP
      INSERT INTO load_stops (
        load_id, stop_number, stop_type, company_name, address,
        city, state, zip_code, reference_number, contact_name,
        contact_phone, special_instructions, scheduled_date, scheduled_time
      ) VALUES (
        result_load.id,
        (stop_data->>'stop_number')::INTEGER,
        stop_data->>'stop_type',
        stop_data->>'company_name',
        stop_data->>'address',
        stop_data->>'city',
        stop_data->>'state',
        stop_data->>'zip_code',
        NULLIF(stop_data->>'reference_number', ''),
        NULLIF(stop_data->>'contact_name', ''),
        NULLIF(stop_data->>'contact_phone', ''),
        NULLIF(stop_data->>'special_instructions', ''),
        NULLIF(stop_data->>'scheduled_date', '')::DATE,
        NULLIF(stop_data->>'scheduled_time', '')::TIME
      ) RETURNING * INTO result_stop;
      
      stops_created := stops_created + 1;
    END LOOP;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'stops_created', stops_created,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;