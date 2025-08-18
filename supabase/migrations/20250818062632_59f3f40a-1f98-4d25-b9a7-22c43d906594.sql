-- Actualizar la función simple_load_operation para incluir scheduled_time en las paradas
CREATE OR REPLACE FUNCTION public.simple_load_operation(load_data jsonb, stops_data jsonb, operation_mode text DEFAULT 'create'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  v_load_id uuid;
  s jsonb;
  v_driver_user_id uuid;
  v_payment_period_id uuid;
  calculation_result jsonb;
  old_driver_user_id uuid;
  new_driver_user_id uuid;
  current_status text;
  new_status text;
BEGIN
  -- Require authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  END IF;

  -- Normalize mode
  operation_mode := COALESCE(NULLIF(TRIM(operation_mode), ''), 'create');

  IF operation_mode = 'edit' THEN
    -- Validate target load id
    v_load_id := NULLIF(load_data->>'id', '')::uuid;
    IF v_load_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Falta id de la carga para editar');
    END IF;

    -- Get current driver and status before update
    SELECT driver_user_id, status INTO old_driver_user_id, current_status
    FROM public.loads
    WHERE id = v_load_id;

    -- Get new driver from load_data
    new_driver_user_id := NULLIF(load_data->>'driver_user_id','')::uuid;

    -- Determine new status based on driver assignment logic
    -- ALWAYS verify and correct status based on driver assignment
    IF new_driver_user_id IS NOT NULL THEN
      -- Has driver assigned - should be 'assigned' (unless it's already in a more advanced state)
      IF current_status IN ('created') THEN
        new_status := 'assigned';
      ELSE
        new_status := current_status; -- Keep advanced states like 'in_transit', 'delivered', etc.
      END IF;
    ELSE
      -- No driver assigned - should be 'created' (unless it's in a final state)
      IF current_status IN ('assigned') THEN
        new_status := 'created';
      ELSE
        new_status := current_status; -- Keep other states
      END IF;
    END IF;

    -- Update only known columns; never reference any payment fields
    UPDATE public.loads SET
      load_number = COALESCE(NULLIF(load_data->>'load_number',''), load_number),
      po_number = NULLIF(load_data->>'po_number',''),
      driver_user_id = new_driver_user_id,
      internal_dispatcher_id = NULLIF(load_data->>'internal_dispatcher_id','')::uuid,
      client_id = NULLIF(load_data->>'client_id','')::uuid,
      client_contact_id = NULLIF(load_data->>'client_contact_id','')::uuid,
      total_amount = COALESCE((load_data->>'total_amount')::numeric, total_amount),
      commodity = COALESCE(NULLIF(load_data->>'commodity',''), commodity),
      weight_lbs = COALESCE(NULLIF(load_data->>'weight_lbs','')::integer, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes',''), notes),
      customer_name = COALESCE(NULLIF(load_data->>'customer_name',''), customer_name),
      factoring_percentage = COALESCE(NULLIF(load_data->>'factoring_percentage','')::numeric, factoring_percentage),
      dispatching_percentage = COALESCE(NULLIF(load_data->>'dispatching_percentage','')::numeric, dispatching_percentage),
      leasing_percentage = COALESCE(NULLIF(load_data->>'leasing_percentage','')::numeric, leasing_percentage),
      status = new_status,
      updated_at = now()
    WHERE id = v_load_id
    RETURNING driver_user_id, payment_period_id INTO v_driver_user_id, v_payment_period_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Carga no encontrada');
    END IF;
  ELSE
    -- CREATE mode
    -- For new loads, set initial status based on driver assignment
    new_driver_user_id := NULLIF(load_data->>'driver_user_id','')::uuid;
    new_status := CASE 
      WHEN new_driver_user_id IS NOT NULL THEN 'assigned'
      ELSE 'created'
    END;

    INSERT INTO public.loads (
      load_number,
      po_number,
      driver_user_id,
      internal_dispatcher_id,
      client_id,
      client_contact_id,
      total_amount,
      commodity,
      weight_lbs,
      notes,
      customer_name,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      status,
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number',''),
      new_driver_user_id,
      NULLIF(load_data->>'internal_dispatcher_id','')::uuid,
      NULLIF(load_data->>'client_id','')::uuid,
      NULLIF(load_data->>'client_contact_id','')::uuid,
      COALESCE((load_data->>'total_amount')::numeric, 0),
      NULLIF(load_data->>'commodity',''),
      NULLIF(load_data->>'weight_lbs','')::integer,
      NULLIF(load_data->>'notes',''),
      NULLIF(load_data->>'customer_name',''),
      NULLIF(load_data->>'factoring_percentage','')::numeric,
      NULLIF(load_data->>'dispatching_percentage','')::numeric,
      NULLIF(load_data->>'leasing_percentage','')::numeric,
      new_status,
      current_user_id
    ) RETURNING id, driver_user_id, payment_period_id INTO v_load_id, v_driver_user_id, v_payment_period_id;
  END IF;

  -- Delete existing stops for this load when editing
  IF operation_mode = 'edit' THEN
    DELETE FROM public.load_stops WHERE load_id = v_load_id;
  END IF;

  -- Insert/update stops with scheduled_time included
  FOR s IN SELECT * FROM jsonb_array_elements(stops_data)
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
      reference_number,
      contact_name,
      contact_phone,
      special_instructions,
      scheduled_date,
      scheduled_time,  -- ✅ INCLUIR scheduled_time
      actual_date
    ) VALUES (
      v_load_id,
      (s->>'stop_number')::integer,
      s->>'stop_type',
      s->>'company_name',
      s->>'address',
      s->>'city',
      s->>'state',
      s->>'zip_code',
      NULLIF(s->>'reference_number',''),
      NULLIF(s->>'contact_name',''),
      NULLIF(s->>'contact_phone',''),
      NULLIF(s->>'special_instructions',''),
      NULLIF(s->>'scheduled_date','')::date,
      NULLIF(s->>'scheduled_time',''),  -- ✅ AGREGAR scheduled_time
      NULLIF(s->>'actual_date','')::date
    );
  END LOOP;

  -- Handle payment period calculations if driver assignment changes
  IF operation_mode = 'edit' AND old_driver_user_id != new_driver_user_id THEN
    -- Remove from old driver's calculations if changed
    IF old_driver_user_id IS NOT NULL THEN
      UPDATE public.loads SET payment_period_id = NULL WHERE id = v_load_id;
    END IF;

    -- Calculate for new driver if assigned
    IF new_driver_user_id IS NOT NULL THEN
      SELECT public.assign_load_to_period(v_load_id, new_driver_user_id) INTO calculation_result;
      IF (calculation_result->>'success')::boolean = false THEN
        RAISE WARNING 'Advertencia en cálculo de período: %', calculation_result->>'message';
      END IF;
    END IF;
  ELSIF operation_mode = 'create' AND new_driver_user_id IS NOT NULL THEN
    -- Calculate period for new load with driver
    SELECT public.assign_load_to_period(v_load_id, new_driver_user_id) INTO calculation_result;
    IF (calculation_result->>'success')::boolean = false THEN
      RAISE WARNING 'Advertencia en cálculo de período: %', calculation_result->>'message';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'load_id', v_load_id,
    'message', CASE 
      WHEN operation_mode = 'edit' THEN 'Carga actualizada exitosamente'
      ELSE 'Carga creada exitosamente'
    END,
    'status', new_status
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$function$;