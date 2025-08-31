-- Arreglar el problema de deducciones automáticas por porcentajes de Owner Operator
-- Al crear/editar cargas, deben generarse automáticamente las deducciones correspondientes

-- 1. Actualizar la función simple_load_operation para incluir lógica de deducciones automáticas
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
  oo_record RECORD;
  leasing_expense_type_id uuid;
  factoring_expense_type_id uuid;
  dispatching_expense_type_id uuid;
  dpc_id uuid;
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

    -- Update only known columns; use payment_period_id from load_data if provided
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
      payment_period_id = COALESCE(NULLIF(load_data->>'payment_period_id','')::uuid, payment_period_id),
      status = new_status,
      updated_at = now()
    WHERE id = v_load_id
    RETURNING driver_user_id, payment_period_id, total_amount INTO v_driver_user_id, v_payment_period_id, load_amount;

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
      payment_period_id,
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
      NULLIF(load_data->>'payment_period_id','')::uuid,
      new_status,
      current_user_id
    ) RETURNING id, driver_user_id, payment_period_id, total_amount INTO v_load_id, v_driver_user_id, v_payment_period_id, load_amount;
  END IF;

  -- Delete existing stops for this load when editing
  IF operation_mode = 'edit' THEN
    DELETE FROM public.load_stops WHERE load_id = v_load_id;
  END IF;

  -- Insert/update stops with proper scheduled_time type conversion
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
      scheduled_time,
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
      CASE 
        WHEN NULLIF(s->>'scheduled_time','') IS NOT NULL 
        THEN NULLIF(s->>'scheduled_time','')::time
        ELSE NULL 
      END,
      NULLIF(s->>'actual_date','')::date
    );
  END LOOP;

  -- 🚨 NUEVA LÓGICA: Crear deducciones automáticas por porcentajes de Owner Operator
  IF v_driver_user_id IS NOT NULL AND v_payment_period_id IS NOT NULL AND load_amount > 0 THEN
    -- Obtener porcentajes del Owner Operator
    SELECT leasing_percentage, factoring_percentage, dispatching_percentage
    INTO oo_record
    FROM owner_operators 
    WHERE user_id = v_driver_user_id 
    AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      -- Obtener IDs de tipos de expense 
      SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing' LIMIT 1;
      SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring' LIMIT 1;
      SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching' LIMIT 1;

      -- Obtener driver_period_calculation_id
      SELECT id INTO dpc_id 
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      WHERE dpc.driver_user_id = v_driver_user_id
      AND cpp.id = v_payment_period_id
      LIMIT 1;

      -- Crear deducción por Leasing si aplica
      IF oo_record.leasing_percentage > 0 AND leasing_expense_type_id IS NOT NULL AND dpc_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          user_id,
          payment_period_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          created_by,
          applied_by,
          applied_at,
          status
        ) VALUES (
          v_driver_user_id,
          dpc_id,
          leasing_expense_type_id,
          ROUND(load_amount * (oo_record.leasing_percentage / 100), 2),
          'Deducción automática por Leasing (' || oo_record.leasing_percentage || '%) - Carga ' || (load_data->>'load_number'),
          CURRENT_DATE,
          current_user_id,
          current_user_id,
          now(),
          'applied'
        );
        
        RAISE LOG '💰 Created leasing deduction: % for load %', ROUND(load_amount * (oo_record.leasing_percentage / 100), 2), v_load_id;
      END IF;

      -- Crear deducción por Factoring si aplica
      IF oo_record.factoring_percentage > 0 AND factoring_expense_type_id IS NOT NULL AND dpc_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          user_id,
          payment_period_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          created_by,
          applied_by,
          applied_at,
          status
        ) VALUES (
          v_driver_user_id,
          dpc_id,
          factoring_expense_type_id,
          ROUND(load_amount * (oo_record.factoring_percentage / 100), 2),
          'Deducción automática por Factoring (' || oo_record.factoring_percentage || '%) - Carga ' || (load_data->>'load_number'),
          CURRENT_DATE,
          current_user_id,
          current_user_id,
          now(),
          'applied'
        );
        
        RAISE LOG '💰 Created factoring deduction: % for load %', ROUND(load_amount * (oo_record.factoring_percentage / 100), 2), v_load_id;
      END IF;

      -- Crear deducción por Dispatching si aplica
      IF oo_record.dispatching_percentage > 0 AND dispatching_expense_type_id IS NOT NULL AND dpc_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          user_id,
          payment_period_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          created_by,
          applied_by,
          applied_at,
          status
        ) VALUES (
          v_driver_user_id,
          dpc_id,
          dispatching_expense_type_id,
          ROUND(load_amount * (oo_record.dispatching_percentage / 100), 2),
          'Deducción automática por Dispatching (' || oo_record.dispatching_percentage || '%) - Carga ' || (load_data->>'load_number'),
          CURRENT_DATE,
          current_user_id,
          current_user_id,
          now(),
          'applied'
        );
        
        RAISE LOG '💰 Created dispatching deduction: % for load %', ROUND(load_amount * (oo_record.dispatching_percentage / 100), 2), v_load_id;
      END IF;

      -- Recalcular automáticamente los totales del período
      PERFORM recalculate_payment_period_totals(v_payment_period_id);
      RAISE LOG '🔄 Recalculated payment period totals for period %', v_payment_period_id;
    END IF;
  END IF;

  -- Return success with load information
  RETURN jsonb_build_object(
    'success', true,
    'load', jsonb_build_object(
      'id', v_load_id,
      'driver_user_id', v_driver_user_id,
      'payment_period_id', v_payment_period_id,
      'status', new_status,
      'total_amount', load_amount
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