-- Fix persistent ambiguous "net_payment" error by redefining the ACID RPC used by the app
-- The goal is to remove any references to payment calculation fields from this procedure
-- and keep it strictly focused on creating/updating loads and their stops.

-- 1) Recreate simple_load_operation with a safe, minimal implementation
CREATE OR REPLACE FUNCTION public.simple_load_operation(
  load_data jsonb,
  stops_data jsonb,
  operation_mode text DEFAULT 'create'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  current_user_id uuid;
  v_load_id uuid;
  s jsonb;
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

    -- Update only known columns; never reference any payment fields
    UPDATE public.loads SET
      load_number = COALESCE(NULLIF(load_data->>'load_number',''), load_number),
      po_number = NULLIF(load_data->>'po_number',''),
      driver_user_id = NULLIF(load_data->>'driver_user_id','')::uuid,
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
      updated_at = now()
    WHERE id = v_load_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Carga no encontrada');
    END IF;
  ELSE
    -- CREATE mode
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
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number',''),
      NULLIF(load_data->>'driver_user_id','')::uuid,
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
      current_user_id
    ) RETURNING id INTO v_load_id;
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

  -- Do NOT perform any payment-period recalculation here to avoid ambiguity issues
  RETURN jsonb_build_object('success', true, 'message', 'Operación completada', 'operation_mode', operation_mode, 'load_id', v_load_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Operation failed: ' || COALESCE(SQLERRM, 'unknown error'),
    'error', COALESCE(SQLERRM, 'unknown error'),
    'operation_mode', operation_mode
  );
END;
$$;