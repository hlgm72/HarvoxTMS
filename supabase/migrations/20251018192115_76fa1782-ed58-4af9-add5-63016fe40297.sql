-- ========================================
-- FIX: Agregar manejo de errores en simple_load_operation_with_deductions
-- ========================================

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
  v_new_status text;
  v_old_period_id uuid;
  v_old_driver_id uuid;
  v_old_period_exists boolean;
BEGIN
  v_is_update := (load_id_param IS NOT NULL);
  
  IF v_is_update THEN
    SELECT payment_period_id, driver_user_id 
    INTO v_old_period_id, v_old_driver_id
    FROM loads WHERE id = load_id_param;
  END IF;
  
  v_driver_user_id := (load_data->>'driver_user_id')::uuid;
  v_company_id := (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1);
  v_total_amount := (load_data->>'total_amount')::numeric;
  v_pickup_date := (load_data->>'pickup_date')::date;
  v_delivery_date := (load_data->>'delivery_date')::date;

  v_new_status := CASE 
    WHEN v_driver_user_id IS NOT NULL THEN 'assigned'
    ELSE 'created'
  END;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active company found for user');
  END IF;

  SELECT load_assignment_criteria INTO v_load_assignment_criteria
  FROM companies WHERE id = v_company_id;

  IF v_load_assignment_criteria = 'pickup_date' THEN
    v_relevant_date := v_pickup_date;
  ELSE
    v_relevant_date := v_delivery_date;
  END IF;

  IF v_is_update THEN
    UPDATE loads SET
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
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::numeric, 0),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::numeric, 0),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::numeric, 0),
      pickup_date = v_pickup_date,
      delivery_date = v_delivery_date,
      status = v_new_status,
      updated_at = now()
    WHERE id = load_id_param
    RETURNING id INTO v_load_id;

    IF v_load_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Load not found or permission denied');
    END IF;

    DELETE FROM load_stops WHERE load_id = v_load_id;
  ELSE
    INSERT INTO loads (
      load_number, po_number, driver_user_id, internal_dispatcher_id,
      client_id, client_contact_id, total_amount, commodity, weight_lbs, notes,
      factoring_percentage, dispatching_percentage, leasing_percentage,
      pickup_date, delivery_date, status, created_by
    ) VALUES (
      load_data->>'load_number', load_data->>'po_number', v_driver_user_id,
      (load_data->>'internal_dispatcher_id')::uuid, (load_data->>'client_id')::uuid,
      (load_data->>'client_contact_id')::uuid, v_total_amount, load_data->>'commodity',
      (load_data->>'weight_lbs')::numeric, load_data->>'notes',
      COALESCE((load_data->>'factoring_percentage')::numeric, 0),
      COALESCE((load_data->>'dispatching_percentage')::numeric, 0),
      COALESCE((load_data->>'leasing_percentage')::numeric, 0),
      v_pickup_date, v_delivery_date, v_new_status, auth.uid()
    ) RETURNING id INTO v_load_id;
  END IF;

  FOR v_stop IN SELECT * FROM jsonb_array_elements(stops_data)
  LOOP
    INSERT INTO load_stops (
      load_id, stop_number, stop_type, company_name, address, city, state, zip_code,
      reference_number, contact_name, contact_phone, special_instructions,
      scheduled_date, scheduled_time, actual_date
    ) VALUES (
      v_load_id, (v_stop.value->>'stop_number')::integer, v_stop.value->>'stop_type',
      NULLIF(v_stop.value->>'company_name', ''), NULLIF(v_stop.value->>'address', ''),
      NULLIF(v_stop.value->>'city', ''), NULLIF(v_stop.value->>'state', ''),
      NULLIF(v_stop.value->>'zip_code', ''), NULLIF(v_stop.value->>'reference_number', ''),
      NULLIF(v_stop.value->>'contact_name', ''), NULLIF(v_stop.value->>'contact_phone', ''),
      NULLIF(v_stop.value->>'special_instructions', ''),
      (v_stop.value->>'scheduled_date')::date, (v_stop.value->>'scheduled_time')::time,
      (v_stop.value->>'actual_date')::date
    );
  END LOOP;

  IF v_relevant_date IS NOT NULL THEN
    SELECT id INTO v_company_payment_period_id
    FROM company_payment_periods
    WHERE company_id = v_company_id
    AND v_relevant_date BETWEEN period_start_date AND period_end_date
    LIMIT 1;

    IF v_company_payment_period_id IS NULL THEN
      SELECT create_company_payment_period_if_needed(v_company_id, v_relevant_date, auth.uid()) 
      INTO v_company_payment_period_id;
    END IF;

    UPDATE loads SET payment_period_id = v_company_payment_period_id WHERE id = v_load_id;

    IF v_driver_user_id IS NOT NULL THEN
      SELECT id INTO v_user_payroll_id
      FROM user_payrolls
      WHERE user_id = v_driver_user_id AND company_payment_period_id = v_company_payment_period_id
      LIMIT 1;

      IF v_user_payroll_id IS NULL THEN
        INSERT INTO user_payrolls (
          user_id, company_payment_period_id, company_id, gross_earnings, fuel_expenses,
          total_deductions, other_income, net_payment, has_negative_balance,
          payment_status, status, calculated_by
        ) VALUES (
          v_driver_user_id, v_company_payment_period_id, v_company_id,
          0, 0, 0, 0, 0, false, 'calculated', 'open', auth.uid()
        ) RETURNING id INTO v_user_payroll_id;
      END IF;
      
      -- 🚨 Recalcular deducciones del período actual CON MANEJO DE ERRORES
      BEGIN
        PERFORM recalculate_period_percentage_deductions(v_company_payment_period_id, v_driver_user_id);
      EXCEPTION 
        WHEN foreign_key_violation THEN
          RAISE WARNING 'simple_load_operation: FK violation recalculating current period % for driver %', v_company_payment_period_id, v_driver_user_id;
        WHEN OTHERS THEN
          RAISE WARNING 'simple_load_operation: Error recalculating current period % for driver %: %', v_company_payment_period_id, v_driver_user_id, SQLERRM;
      END;
      
      -- 🚨 Si es una actualización, recalcular períodos antiguos SOLO si existen
      IF v_is_update THEN
        -- Verificar si el período antiguo existe antes de recalcular
        IF v_old_period_id IS NOT NULL THEN
          SELECT EXISTS(
            SELECT 1 FROM company_payment_periods WHERE id = v_old_period_id
          ) INTO v_old_period_exists;
        ELSE
          v_old_period_exists := false;
        END IF;

        -- Si cambió de período Y el período antiguo existe, recalcularlo CON MANEJO DE ERRORES
        IF v_old_period_exists AND v_old_period_id != v_company_payment_period_id AND v_old_driver_id IS NOT NULL THEN
          BEGIN
            PERFORM recalculate_period_percentage_deductions(v_old_period_id, v_old_driver_id);
            RAISE LOG 'simple_load_operation: Recalculated old period % for driver %', v_old_period_id, v_old_driver_id;
          EXCEPTION 
            WHEN foreign_key_violation THEN
              RAISE WARNING 'simple_load_operation: FK violation recalculating old period % for driver %', v_old_period_id, v_old_driver_id;
            WHEN OTHERS THEN
              RAISE WARNING 'simple_load_operation: Error recalculating old period % for driver %: %', v_old_period_id, v_old_driver_id, SQLERRM;
          END;
        END IF;
        
        -- Si cambió de conductor Y el período antiguo existe, recalcular para el conductor antiguo CON MANEJO DE ERRORES
        IF v_old_period_exists AND v_old_driver_id IS NOT NULL AND v_old_driver_id != v_driver_user_id THEN
          BEGIN
            PERFORM recalculate_period_percentage_deductions(v_company_payment_period_id, v_old_driver_id);
            RAISE LOG 'simple_load_operation: Recalculated period % for old driver %', v_company_payment_period_id, v_old_driver_id;
          EXCEPTION 
            WHEN foreign_key_violation THEN
              RAISE WARNING 'simple_load_operation: FK violation recalculating period % for old driver %', v_company_payment_period_id, v_old_driver_id;
            WHEN OTHERS THEN
              RAISE WARNING 'simple_load_operation: Error recalculating period % for old driver %: %', v_company_payment_period_id, v_old_driver_id, SQLERRM;
          END;
        END IF;
      END IF;
      
      -- Calcular totales del payroll CON MANEJO DE ERRORES
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE WARNING 'simple_load_operation: Error calculating payroll % for user %: %', v_user_payroll_id, v_driver_user_id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'load', jsonb_build_object(
      'id', v_load_id,
      'company_payment_period_id', v_company_payment_period_id,
      'user_payroll_id', v_user_payroll_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;