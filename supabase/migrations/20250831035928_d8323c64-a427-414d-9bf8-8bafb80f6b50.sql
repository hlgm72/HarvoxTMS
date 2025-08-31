-- SOLUCIÓN ROBUSTA: Función mejorada para manejar correctamente las ediciones de cargas
-- y garantizar integridad en los cálculos de deducciones por porcentajes

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
  old_driver_user_id uuid;
  new_driver_user_id uuid;
  current_status text;
  new_status text;
  load_amount numeric;
  old_load_amount numeric := 0;
  
  -- Porcentajes antiguos y nuevos
  old_leasing_pct numeric := 0;
  old_factoring_pct numeric := 0;
  old_dispatching_pct numeric := 0;
  new_leasing_pct numeric := 0;
  new_factoring_pct numeric := 0;
  new_dispatching_pct numeric := 0;
  
  oo_record RECORD;
  leasing_expense_type_id uuid;
  factoring_expense_type_id uuid;
  dispatching_expense_type_id uuid;
  dpc_id uuid;
  
  -- Flags para saber si necesitamos recalcular
  percentages_changed boolean := false;
  amount_changed boolean := false;
  driver_changed boolean := false;
BEGIN
  -- Require authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no autenticado');
  END IF;

  -- Normalize mode
  operation_mode := COALESCE(NULLIF(TRIM(operation_mode), ''), 'create');

  -- Obtener IDs de tipos de expense
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;

  IF operation_mode = 'edit' THEN
    -- MODO EDICIÓN: Capturar valores antiguos para comparar
    v_load_id := NULLIF(load_data->>'id', '')::uuid;
    IF v_load_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Falta id de la carga para editar');
    END IF;

    -- Capturar valores antiguos
    SELECT 
      driver_user_id, 
      status, 
      total_amount,
      COALESCE(leasing_percentage, 0),
      COALESCE(factoring_percentage, 0),
      COALESCE(dispatching_percentage, 0)
    INTO 
      old_driver_user_id, 
      current_status, 
      old_load_amount,
      old_leasing_pct,
      old_factoring_pct,
      old_dispatching_pct
    FROM public.loads
    WHERE id = v_load_id;

    -- Obtener nuevos valores
    new_driver_user_id := NULLIF(load_data->>'driver_user_id','')::uuid;
    load_amount := COALESCE((load_data->>'total_amount')::numeric, old_load_amount);
    new_leasing_pct := COALESCE(NULLIF(load_data->>'leasing_percentage','')::numeric, old_leasing_pct);
    new_factoring_pct := COALESCE(NULLIF(load_data->>'factoring_percentage','')::numeric, old_factoring_pct);
    new_dispatching_pct := COALESCE(NULLIF(load_data->>'dispatching_percentage','')::numeric, old_dispatching_pct);

    -- Detectar cambios significativos
    percentages_changed := (old_leasing_pct != new_leasing_pct OR 
                           old_factoring_pct != new_factoring_pct OR 
                           old_dispatching_pct != new_dispatching_pct);
    amount_changed := (old_load_amount != load_amount);
    driver_changed := (old_driver_user_id != new_driver_user_id);

    RAISE LOG '🔍 EDIT MODE: Changes detected - Percentages: %, Amount: %, Driver: %', 
      percentages_changed, amount_changed, driver_changed;

    -- Determinar nuevo status
    IF new_driver_user_id IS NOT NULL THEN
      IF current_status IN ('created') THEN
        new_status := 'assigned';
      ELSE
        new_status := current_status;
      END IF;
    ELSE
      IF current_status IN ('assigned') THEN
        new_status := 'created';
      ELSE
        new_status := current_status;
      END IF;
    END IF;

    -- Actualizar la carga
    UPDATE public.loads SET
      load_number = COALESCE(NULLIF(load_data->>'load_number',''), load_number),
      po_number = NULLIF(load_data->>'po_number',''),
      driver_user_id = new_driver_user_id,
      internal_dispatcher_id = NULLIF(load_data->>'internal_dispatcher_id','')::uuid,
      client_id = NULLIF(load_data->>'client_id','')::uuid,
      client_contact_id = NULLIF(load_data->>'client_contact_id','')::uuid,
      total_amount = load_amount,
      commodity = COALESCE(NULLIF(load_data->>'commodity',''), commodity),
      weight_lbs = COALESCE(NULLIF(load_data->>'weight_lbs','')::integer, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes',''), notes),
      customer_name = COALESCE(NULLIF(load_data->>'customer_name',''), customer_name),
      factoring_percentage = new_factoring_pct,
      dispatching_percentage = new_dispatching_pct,
      leasing_percentage = new_leasing_pct,
      payment_period_id = COALESCE(NULLIF(load_data->>'payment_period_id','')::uuid, payment_period_id),
      status = new_status,
      updated_at = now()
    WHERE id = v_load_id
    RETURNING driver_user_id, payment_period_id, total_amount INTO v_driver_user_id, v_payment_period_id, load_amount;

    -- ⚡ LÓGICA DE DEDUCCIONES EN EDICIÓN
    IF v_driver_user_id IS NOT NULL AND v_payment_period_id IS NOT NULL AND (percentages_changed OR amount_changed OR driver_changed) THEN
      RAISE LOG '🔄 Recalculating deductions due to changes in edit mode';
      
      -- Eliminar deducciones específicas de esta carga (si existen)
      DELETE FROM expense_instances 
      WHERE user_id = v_driver_user_id
        AND description LIKE '%Carga ' || (load_data->>'load_number') || '%';

      -- Crear nuevas deducciones con los valores actualizados
      PERFORM create_percentage_deductions_for_load(
        v_load_id, 
        v_driver_user_id, 
        v_payment_period_id, 
        load_amount, 
        new_leasing_pct, 
        new_factoring_pct, 
        new_dispatching_pct,
        load_data->>'load_number',
        current_user_id
      );
    END IF;

  ELSE
    -- MODO CREACIÓN: Lógica original
    new_driver_user_id := NULLIF(load_data->>'driver_user_id','')::uuid;
    new_status := CASE 
      WHEN new_driver_user_id IS NOT NULL THEN 'assigned'
      ELSE 'created'
    END;

    INSERT INTO public.loads (
      load_number, po_number, driver_user_id, internal_dispatcher_id,
      client_id, client_contact_id, total_amount, commodity, weight_lbs,
      notes, customer_name, factoring_percentage, dispatching_percentage,
      leasing_percentage, payment_period_id, status, created_by
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
      NULLIF(load_data->>'payment_period_id','')::uuid,
      new_status,
      current_user_id
    ) RETURNING id, driver_user_id, payment_period_id, total_amount INTO v_load_id, v_driver_user_id, v_payment_period_id, load_amount;

    -- Crear deducciones para nueva carga
    IF v_driver_user_id IS NOT NULL AND v_payment_period_id IS NOT NULL AND load_amount > 0 THEN
      PERFORM create_percentage_deductions_for_load(
        v_load_id,
        v_driver_user_id,
        v_payment_period_id,
        load_amount,
        COALESCE(NULLIF(load_data->>'leasing_percentage','')::numeric, 0),
        COALESCE(NULLIF(load_data->>'factoring_percentage','')::numeric, 0),
        COALESCE(NULLIF(load_data->>'dispatching_percentage','')::numeric, 0),
        load_data->>'load_number',
        current_user_id
      );
    END IF;
  END IF;

  -- Manejar stops (igual que antes)
  IF operation_mode = 'edit' THEN
    DELETE FROM public.load_stops WHERE load_id = v_load_id;
  END IF;

  FOR s IN SELECT * FROM jsonb_array_elements(stops_data)
  LOOP
    INSERT INTO public.load_stops (
      load_id, stop_number, stop_type, company_name, address, city, state, zip_code,
      reference_number, contact_name, contact_phone, special_instructions,
      scheduled_date, scheduled_time, actual_date
    ) VALUES (
      v_load_id,
      (s->>'stop_number')::integer, s->>'stop_type', s->>'company_name',
      s->>'address', s->>'city', s->>'state', s->>'zip_code',
      NULLIF(s->>'reference_number',''), NULLIF(s->>'contact_name',''),
      NULLIF(s->>'contact_phone',''), NULLIF(s->>'special_instructions',''),
      NULLIF(s->>'scheduled_date','')::date,
      CASE WHEN NULLIF(s->>'scheduled_time','') IS NOT NULL 
           THEN NULLIF(s->>'scheduled_time','')::time ELSE NULL END,
      NULLIF(s->>'actual_date','')::date
    );
  END LOOP;

  -- Recalcular totales del período si hubo cambios significativos
  IF operation_mode = 'edit' AND (percentages_changed OR amount_changed OR driver_changed) THEN
    PERFORM recalculate_payment_period_totals(v_payment_period_id);
    RAISE LOG '🔄 Recalculated payment period totals due to significant changes';
  ELSIF operation_mode = 'create' AND v_driver_user_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(v_payment_period_id);
    RAISE LOG '🔄 Recalculated payment period totals for new load';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'load', jsonb_build_object(
      'id', v_load_id,
      'driver_user_id', v_driver_user_id,
      'payment_period_id', v_payment_period_id,
      'status', new_status,
      'total_amount', load_amount
    ),
    'changes_detected', jsonb_build_object(
      'percentages_changed', percentages_changed,
      'amount_changed', amount_changed,
      'driver_changed', driver_changed
    ),
    'message', CASE 
      WHEN operation_mode = 'edit' THEN 'Carga actualizada exitosamente'
      ELSE 'Carga creada exitosamente'
    END
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$function$;