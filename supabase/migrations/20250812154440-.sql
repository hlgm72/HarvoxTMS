-- Improve simple_load_operation with better error handling and validation
CREATE OR REPLACE FUNCTION public.simple_load_operation(
  load_data jsonb,
  stops_data jsonb,
  operation_mode text DEFAULT 'create'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_load_id uuid;
  stop_record jsonb;
  result_data jsonb;
  affected_rows integer;
BEGIN
  -- Log the start of operation
  RAISE LOG 'simple_load_operation started: mode=%, load_data=%', operation_mode, load_data;
  
  -- Validate inputs
  IF load_data IS NULL THEN
    RAISE EXCEPTION 'load_data cannot be null';
  END IF;
  
  IF stops_data IS NULL THEN
    RAISE EXCEPTION 'stops_data cannot be null';
  END IF;
  
  -- Handle edit mode
  IF operation_mode = 'edit' THEN
    -- Get the load ID from the load_data
    target_load_id := (load_data->>'id')::uuid;
    
    IF target_load_id IS NULL THEN
      RAISE EXCEPTION 'load_id is required for edit mode';
    END IF;
    
    -- Verify the load exists and user has access
    IF NOT EXISTS (
      SELECT 1 FROM public.loads l
      JOIN public.user_company_roles ucr ON l.company_id = ucr.company_id
      WHERE l.id = target_load_id
      AND ucr.user_id = auth.uid()
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Load not found or no permission to edit';
    END IF;
    
    -- Delete existing stops for this load
    DELETE FROM public.load_stops WHERE load_id = target_load_id;
    
    -- Update the load record directly without RLS checks
    UPDATE public.loads SET
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
      updated_at = NOW()
    WHERE id = target_load_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows = 0 THEN
      RAISE EXCEPTION 'No rows updated - load may not exist or no permission';
    END IF;
    
    RAISE LOG 'simple_load_operation: Updated load % with % rows affected', target_load_id, affected_rows;
    
  ELSE
    -- Create mode - insert new load
    INSERT INTO public.loads (
      load_number, po_number, driver_user_id, internal_dispatcher_id,
      client_id, client_contact_id, total_amount, commodity, weight_lbs,
      notes, customer_name, factoring_percentage, dispatching_percentage,
      leasing_percentage, company_id, created_by
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
      (SELECT company_id FROM public.user_company_roles WHERE user_id = auth.uid() LIMIT 1),
      auth.uid()
    ) RETURNING id INTO target_load_id;
    
    IF target_load_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create load - no ID returned';
    END IF;
    
    RAISE LOG 'simple_load_operation: Created new load with ID %', target_load_id;
  END IF;
  
  -- Insert stops
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
  
  -- Return success result
  result_data := jsonb_build_object(
    'success', true,
    'load_id', target_load_id,
    'operation_mode', operation_mode,
    'message', operation_mode || ' operation completed successfully'
  );
  
  RAISE LOG 'simple_load_operation completed: %', result_data;
  RETURN result_data;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'simple_load_operation error: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Operation failed: ' || SQLERRM,
    'operation_mode', operation_mode,
    'load_data_received', load_data
  );
END;
$$;