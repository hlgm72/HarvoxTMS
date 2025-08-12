-- Fix ambiguous net_payment error by simplifying simple_load_operation and fully qualifying all updates
-- The function will only create/update loads and their stops. Any payment recalculation is handled elsewhere.

CREATE OR REPLACE FUNCTION public.simple_load_operation(
  load_data jsonb,
  stops_data jsonb,
  operation_mode text DEFAULT 'create'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_load_id uuid;
  stop_record jsonb;
  result_data jsonb;
  affected_rows integer;
  current_user_id uuid;
  user_company_id uuid;
BEGIN
  -- Auth check
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Resolve user's company (first active)
  SELECT ucr.company_id INTO user_company_id
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = current_user_id AND ucr.is_active = true
  LIMIT 1;
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no tiene empresa asignada';
  END IF;

  -- Input validation
  IF load_data IS NULL THEN
    RAISE EXCEPTION 'load_data cannot be null';
  END IF;
  IF stops_data IS NULL THEN
    RAISE EXCEPTION 'stops_data cannot be null';
  END IF;

  RAISE LOG 'simple_load_operation started: mode=%, load=%', operation_mode, load_data;

  IF operation_mode = 'edit' THEN
    -- Edit mode requires existing load id
    target_load_id := (load_data->>'id')::uuid;
    IF target_load_id IS NULL THEN
      RAISE EXCEPTION 'load_id is required for edit mode';
    END IF;

    -- Verify access via creator's company (loads has no company_id)
    IF NOT EXISTS (
      SELECT 1
      FROM public.loads l
      JOIN public.user_company_roles ucr ON ucr.user_id = l.created_by
      WHERE l.id = target_load_id
        AND ucr.company_id = user_company_id
        AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Load not found or no permission to edit';
    END IF;

    -- Remove current stops then update load
    DELETE FROM public.load_stops WHERE load_id = target_load_id;

    UPDATE public.loads AS l SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      driver_user_id = NULLIF(load_data->>'driver_user_id', '')::uuid,
      internal_dispatcher_id = NULLIF(load_data->>'internal_dispatcher_id', '')::uuid,
      client_id = NULLIF(load_data->>'client_id', '')::uuid,
      client_contact_id = NULLIF(load_data->>'client_contact_id', '')::uuid,
      total_amount = (load_data->>'total_amount')::numeric,
      commodity = load_data->>'commodity',
      weight_lbs = (load_data->>'weight_lbs')::integer,
      notes = load_data->>'notes',
      customer_name = load_data->>'customer_name',
      factoring_percentage = (load_data->>'factoring_percentage')::numeric,
      dispatching_percentage = (load_data->>'dispatching_percentage')::numeric,
      leasing_percentage = (load_data->>'leasing_percentage')::numeric,
      updated_at = now()
    WHERE l.id = target_load_id;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows = 0 THEN
      RAISE EXCEPTION 'No rows updated - load may not exist or no permission';
    END IF;

    RAISE LOG 'simple_load_operation: updated load %, affected_rows=%', target_load_id, affected_rows;
  ELSE
    -- Create new load
    INSERT INTO public.loads (
      load_number, po_number, driver_user_id, internal_dispatcher_id,
      client_id, client_contact_id, total_amount, commodity, weight_lbs,
      notes, customer_name, factoring_percentage, dispatching_percentage,
      leasing_percentage, created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF(load_data->>'driver_user_id', '')::uuid,
      NULLIF(load_data->>'internal_dispatcher_id', '')::uuid,
      NULLIF(load_data->>'client_id', '')::uuid,
      NULLIF(load_data->>'client_contact_id', '')::uuid,
      (load_data->>'total_amount')::numeric,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::integer,
      load_data->>'notes',
      load_data->>'customer_name',
      (load_data->>'factoring_percentage')::numeric,
      (load_data->>'dispatching_percentage')::numeric,
      (load_data->>'leasing_percentage')::numeric,
      current_user_id
    ) RETURNING id INTO target_load_id;

    IF target_load_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create load - no ID returned';
    END IF;

    RAISE LOG 'simple_load_operation: created load %', target_load_id;
  END IF;

  -- Insert provided stops
  FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data)
  LOOP
    INSERT INTO public.load_stops (
      load_id, stop_number, stop_type, company_name, address, city, state, zip_code,
      reference_number, contact_name, contact_phone, special_instructions,
      scheduled_date, actual_date
    ) VALUES (
      target_load_id,
      (stop_record->>'stop_number')::integer,
      stop_record->>'stop_type',
      stop_record->>'company_name',
      stop_record->>'address',
      stop_record->>'city',
      stop_record->>'state',
      stop_record->>'zip_code',
      NULLIF(stop_record->>'reference_number', ''),
      NULLIF(stop_record->>'contact_name', ''),
      NULLIF(stop_record->>'contact_phone', ''),
      NULLIF(stop_record->>'special_instructions', ''),
      NULLIF(stop_record->>'scheduled_date', '')::date,
      NULLIF(stop_record->>'actual_date', '')::date
    );
  END LOOP;

  result_data := jsonb_build_object(
    'success', true,
    'load_id', target_load_id,
    'operation_mode', operation_mode,
    'message', CASE WHEN operation_mode = 'edit' THEN 'Load updated successfully' ELSE 'Load created successfully' END
  );

  RAISE LOG 'simple_load_operation completed: %', result_data;
  RETURN result_data;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'simple_load_operation error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'operation_mode', operation_mode,
    'error', SQLERRM,
    'message', 'Operation failed: ' || SQLERRM
  );
END;
$function$;