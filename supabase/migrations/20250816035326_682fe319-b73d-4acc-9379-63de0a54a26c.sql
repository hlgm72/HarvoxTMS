-- Fix simple_load_operation to automatically update status when driver is assigned
CREATE OR REPLACE FUNCTION public.simple_load_operation(
  load_data jsonb, 
  stops_data jsonb, 
  operation_mode text DEFAULT 'create'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    new_status := current_status; -- Default: keep current status
    
    -- Auto-update status logic:
    -- If driver is being assigned and status is 'created', change to 'assigned'
    IF new_driver_user_id IS NOT NULL AND old_driver_user_id IS NULL AND current_status = 'created' THEN
      new_status := 'assigned';
    -- If driver is being removed and status is 'assigned', change back to 'created' 
    ELSIF new_driver_user_id IS NULL AND old_driver_user_id IS NOT NULL AND current_status = 'assigned' THEN
      new_status := 'created';
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

  -- If we are editing, v_load_id might not be set yet
  IF v_load_id IS NULL THEN
    v_load_id := (load_data->>'id')::uuid;
  END IF;

  -- Replace stops atomically: delete then insert new ones
  IF stops_data IS NOT NULL THEN
    DELETE FROM public.load_stops WHERE load_id = v_load_id;

    FOR s IN SELECT value FROM jsonb_array_elements(stops_data) LOOP
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
        actual_date
      ) VALUES (
        v_load_id,
        COALESCE((s->>'stop_number')::int, 0),
        s->>'stop_type',
        NULLIF(s->>'company_name',''),
        s->>'address',
        s->>'city',
        s->>'state',
        NULLIF(s->>'zip_code',''),
        NULLIF(s->>'reference_number',''),
        NULLIF(s->>'contact_name',''),
        NULLIF(s->>'contact_phone',''),
        NULLIF(s->>'special_instructions',''),
        NULLIF(s->>'scheduled_date','')::date,
        NULLIF(s->>'actual_date','')::date
      );
    END LOOP;
  END IF;

  -- ✅ CRITICAL FIX: Automatically recalculate driver payment period after editing loads
  IF operation_mode = 'edit' AND v_driver_user_id IS NOT NULL AND v_payment_period_id IS NOT NULL THEN
    -- Find the driver's calculation record for this period
    DECLARE
      calculation_id uuid;
    BEGIN
      SELECT dpc.id INTO calculation_id
      FROM driver_period_calculations dpc
      WHERE dpc.driver_user_id = v_driver_user_id
        AND dpc.company_payment_period_id = v_payment_period_id;
      
      IF calculation_id IS NOT NULL THEN
        -- Recalculate the driver's payment period with validation
        SELECT calculate_driver_payment_period_with_validation(calculation_id) INTO calculation_result;
        
        -- Log the recalculation result
        RAISE NOTICE 'Auto-recalculated payment period for driver % in period %: %', 
          v_driver_user_id, v_payment_period_id, calculation_result;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail the load operation if recalculation fails
      RAISE NOTICE 'Warning: Auto-recalculation failed for driver % in period %: %', 
        v_driver_user_id, v_payment_period_id, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Operación completada', 
    'operation_mode', operation_mode, 
    'load_id', v_load_id,
    'status_updated', CASE 
      WHEN operation_mode = 'edit' AND new_status != current_status THEN true
      ELSE false
    END,
    'new_status', new_status,
    'auto_recalculated', operation_mode = 'edit' AND v_driver_user_id IS NOT NULL AND v_payment_period_id IS NOT NULL
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error en operación ACID: ' || SQLERRM,
    'operation_mode', operation_mode
  );
END;
$$;