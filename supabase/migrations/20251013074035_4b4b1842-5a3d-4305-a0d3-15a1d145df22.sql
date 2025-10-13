-- Corregir el estado de la carga cuando se asigna un conductor
-- El estado debe ser 'assigned' cuando hay driver_user_id, de lo contrario 'created'

CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(load_data jsonb, stops_data jsonb DEFAULT '[]'::jsonb, load_id_param uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_load_id uuid;
  v_result jsonb;
  v_driver_user_id uuid;
  v_company_id uuid;
  v_company_payment_period_id uuid;
  v_user_payroll_id uuid;
  v_pickup_date date;
  v_delivery_date date;
  v_total_amount numeric;
  v_stop record;
  v_is_update boolean;
  v_relevant_date date;
  v_load_assignment_criteria text;
  v_factoring_pct numeric;
  v_dispatching_pct numeric;
  v_leasing_pct numeric;
  v_factoring_amt numeric;
  v_dispatching_amt numeric;
  v_leasing_amt numeric;
  v_new_status text;
BEGIN
  -- Determine if this is an update or create
  v_is_update := (load_id_param IS NOT NULL);
  
  -- Extract key values from load_data
  v_driver_user_id := (load_data->>'driver_user_id')::uuid;
  v_company_id := (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1);
  v_total_amount := (load_data->>'total_amount')::numeric;
  v_pickup_date := (load_data->>'pickup_date')::date;
  v_delivery_date := (load_data->>'delivery_date')::date;
  v_factoring_pct := COALESCE((load_data->>'factoring_percentage')::numeric, 0);
  v_dispatching_pct := COALESCE((load_data->>'dispatching_percentage')::numeric, 0);
  v_leasing_pct := COALESCE((load_data->>'leasing_percentage')::numeric, 0);

  -- Determine status based on driver assignment
  v_new_status := CASE 
    WHEN v_driver_user_id IS NOT NULL THEN 'assigned'
    ELSE 'created'
  END;

  -- Validate company_id
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active company found for user'
    );
  END IF;

  -- Get company's load assignment criteria
  SELECT load_assignment_criteria INTO v_load_assignment_criteria
  FROM companies
  WHERE id = v_company_id;

  -- Determine relevant date based on company criteria
  IF v_load_assignment_criteria = 'pickup_date' THEN
    v_relevant_date := v_pickup_date;
  ELSE
    v_relevant_date := v_delivery_date;
  END IF;

  -- Create or update the load
  IF v_is_update THEN
    UPDATE loads
    SET
      load_number = load_data->>'load_number',
      po_number = load_data->>'po_number',
      driver_user_id = v_driver_user_id,
      internal_dispatcher_id = (load_data->>'internal_dispatcher_id')::uuid,
      client_id = (load_data->>'client_id')::uuid,
      client_contact_id = (load_data->>'client_contact_id')::uuid,
      total_amount = v_total_amount,
      commodity = load_data->>'commodity',
      weight_lbs = (load_data->>'weight_lbs')::numeric,
      notes = load_data->>'notes',
      factoring_percentage = v_factoring_pct,
      dispatching_percentage = v_dispatching_pct,
      leasing_percentage = v_leasing_pct,
      pickup_date = v_pickup_date,
      delivery_date = v_delivery_date,
      status = v_new_status,
      updated_at = now()
    WHERE id = load_id_param
    RETURNING id INTO v_load_id;

    IF v_load_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Load not found or permission denied'
      );
    END IF;

    DELETE FROM load_stops WHERE load_id = v_load_id;
  ELSE
    INSERT INTO loads (
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
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      pickup_date,
      delivery_date,
      status,
      created_by
    ) VALUES (
      load_data->>'load_number',
      load_data->>'po_number',
      v_driver_user_id,
      (load_data->>'internal_dispatcher_id')::uuid,
      (load_data->>'client_id')::uuid,
      (load_data->>'client_contact_id')::uuid,
      v_total_amount,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::numeric,
      load_data->>'notes',
      v_factoring_pct,
      v_dispatching_pct,
      v_leasing_pct,
      v_pickup_date,
      v_delivery_date,
      v_new_status,
      auth.uid()
    )
    RETURNING id INTO v_load_id;
  END IF;

  -- Insert stops
  FOR v_stop IN SELECT * FROM jsonb_array_elements(stops_data)
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
      reference_number,
      contact_name,
      contact_phone,
      special_instructions,
      scheduled_date,
      scheduled_time,
      actual_date
    ) VALUES (
      v_load_id,
      (v_stop.value->>'stop_number')::integer,
      v_stop.value->>'stop_type',
      NULLIF(v_stop.value->>'company_name', ''),
      NULLIF(v_stop.value->>'address', ''),
      NULLIF(v_stop.value->>'city', ''),
      NULLIF(v_stop.value->>'state', ''),
      NULLIF(v_stop.value->>'zip_code', ''),
      NULLIF(v_stop.value->>'reference_number', ''),
      NULLIF(v_stop.value->>'contact_name', ''),
      NULLIF(v_stop.value->>'contact_phone', ''),
      NULLIF(v_stop.value->>'special_instructions', ''),
      (v_stop.value->>'scheduled_date')::date,
      (v_stop.value->>'scheduled_time')::time,
      (v_stop.value->>'actual_date')::date
    );
  END LOOP;

  -- Create payment period if needed
  IF v_relevant_date IS NOT NULL THEN
    SELECT id INTO v_company_payment_period_id
    FROM company_payment_periods
    WHERE company_id = v_company_id
    AND v_relevant_date BETWEEN period_start_date AND period_end_date
    LIMIT 1;

    IF v_company_payment_period_id IS NULL THEN
      SELECT create_company_payment_period_if_needed(
        v_company_id,
        v_relevant_date,
        auth.uid()
      ) INTO v_company_payment_period_id;
    END IF;

    UPDATE loads
    SET payment_period_id = v_company_payment_period_id
    WHERE id = v_load_id;

    -- Create or get user_payroll
    IF v_driver_user_id IS NOT NULL THEN
      SELECT id INTO v_user_payroll_id
      FROM user_payrolls
      WHERE user_id = v_driver_user_id
      AND company_payment_period_id = v_company_payment_period_id
      LIMIT 1;

      IF v_user_payroll_id IS NULL THEN
        INSERT INTO user_payrolls (
          user_id,
          company_payment_period_id,
          company_id,
          gross_earnings,
          fuel_expenses,
          total_deductions,
          other_income,
          net_payment,
          has_negative_balance,
          payment_status,
          status,
          calculated_by
        )
        VALUES (
          v_driver_user_id,
          v_company_payment_period_id,
          v_company_id,
          0, 0, 0, 0, 0,
          false,
          'calculated',
          'open',
          auth.uid()
        )
        RETURNING id INTO v_user_payroll_id;
      END IF;
      
      -- ✅ CÁLCULO AUTOMÁTICO: Recalcular el payroll después de crear la carga
      PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      
      -- ✅ GENERAR DEDUCCIONES POR PORCENTAJE
      -- Calcular montos de deducciones
      v_factoring_amt := ROUND(v_total_amount * v_factoring_pct / 100, 2);
      v_dispatching_amt := ROUND(v_total_amount * v_dispatching_pct / 100, 2);
      v_leasing_amt := ROUND(v_total_amount * v_leasing_pct / 100, 2);
      
      -- Insertar deducción por factoring si aplica
      IF v_factoring_amt > 0 THEN
        INSERT INTO expense_instances (
          user_id,
          expense_type_id,
          amount,
          expense_date,
          description,
          payment_period_id,
          created_by
        ) VALUES (
          v_driver_user_id,
          '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb',
          v_factoring_amt,
          v_relevant_date,
          'Factoring fee for load #' || (load_data->>'load_number') || ' ($' || v_total_amount || ' × ' || v_factoring_pct || '%)',
          v_company_payment_period_id,
          auth.uid()
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Insertar deducción por dispatching si aplica
      IF v_dispatching_amt > 0 THEN
        INSERT INTO expense_instances (
          user_id,
          expense_type_id,
          amount,
          expense_date,
          description,
          payment_period_id,
          created_by
        ) VALUES (
          v_driver_user_id,
          '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10',
          v_dispatching_amt,
          v_relevant_date,
          'Dispatching fee for load #' || (load_data->>'load_number') || ' ($' || v_total_amount || ' × ' || v_dispatching_pct || '%)',
          v_company_payment_period_id,
          auth.uid()
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Insertar deducción por leasing si aplica
      IF v_leasing_amt > 0 THEN
        INSERT INTO expense_instances (
          user_id,
          expense_type_id,
          amount,
          expense_date,
          description,
          payment_period_id,
          created_by
        ) VALUES (
          v_driver_user_id,
          '28d59af7-c756-40bf-885e-fb995a744003',
          v_leasing_amt,
          v_relevant_date,
          'Leasing fee for load #' || (load_data->>'load_number') || ' ($' || v_total_amount || ' × ' || v_leasing_pct || '%)',
          v_company_payment_period_id,
          auth.uid()
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Recalcular una vez más después de agregar deducciones
      PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'load', jsonb_build_object(
      'id', v_load_id,
      'company_payment_period_id', v_company_payment_period_id,
      'user_payroll_id', v_user_payroll_id
    )
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;