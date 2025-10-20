
-- ============================================================================
-- MIGRATION: Fix payment_date calculation in user_payrolls
-- ============================================================================
-- Problema: Los user_payrolls se crean con payment_date NULL
-- Solución: 
--   1. Actualizar registros existentes con payment_date NULL
--   2. Modificar funciones que crean user_payrolls para calcular payment_date
--   3. Crear trigger para asegurar que payment_date siempre se calcule
-- ============================================================================

-- PASO 1: Actualizar registros existentes con payment_date NULL
-- ============================================================================
UPDATE user_payrolls up
SET payment_date = calculate_payment_date(
  (SELECT period_end_date FROM company_payment_periods WHERE id = up.company_payment_period_id),
  (SELECT payment_day FROM companies WHERE id = up.company_id)
)
WHERE up.payment_date IS NULL
AND up.company_payment_period_id IS NOT NULL
AND up.company_id IS NOT NULL;

-- PASO 2: Crear función auxiliar para obtener payment_date de un período
-- ============================================================================
CREATE OR REPLACE FUNCTION get_payment_date_for_period(
  period_id UUID
) RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_end DATE;
  v_payment_day TEXT;
  v_company_id UUID;
BEGIN
  -- Obtener información del período
  SELECT cpp.period_end_date, cpp.company_id, c.payment_day
  INTO v_period_end, v_company_id, v_payment_day
  FROM company_payment_periods cpp
  JOIN companies c ON c.id = cpp.company_id
  WHERE cpp.id = period_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calcular payment_date
  RETURN calculate_payment_date(v_period_end, v_payment_day);
END;
$$;

-- PASO 3: Crear trigger para calcular payment_date automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION set_user_payroll_payment_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si payment_date es NULL y tenemos company_payment_period_id, calcularlo
  IF NEW.payment_date IS NULL AND NEW.company_payment_period_id IS NOT NULL THEN
    NEW.payment_date := get_payment_date_for_period(NEW.company_payment_period_id);
    
    RAISE LOG 'set_user_payroll_payment_date: Calculated payment_date % for payroll % (period: %)', 
      NEW.payment_date, NEW.id, NEW.company_payment_period_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trigger_set_user_payroll_payment_date ON user_payrolls;
CREATE TRIGGER trigger_set_user_payroll_payment_date
  BEFORE INSERT OR UPDATE ON user_payrolls
  FOR EACH ROW
  EXECUTE FUNCTION set_user_payroll_payment_date();

-- PASO 4: Modificar simple_load_operation_with_deductions para usar payment_date
-- ============================================================================
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
  v_payment_date date;
BEGIN
  v_is_update := (load_id_param IS NOT NULL);
  
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
      -- Calcular payment_date usando la función auxiliar
      v_payment_date := get_payment_date_for_period(v_company_payment_period_id);
      
      SELECT id INTO v_user_payroll_id
      FROM user_payrolls
      WHERE user_id = v_driver_user_id AND company_payment_period_id = v_company_payment_period_id
      LIMIT 1;

      IF v_user_payroll_id IS NULL THEN
        INSERT INTO user_payrolls (
          user_id, company_payment_period_id, company_id, gross_earnings, fuel_expenses,
          total_deductions, other_income, net_payment, has_negative_balance,
          payment_status, status, payment_date, calculated_by
        ) VALUES (
          v_driver_user_id, v_company_payment_period_id, v_company_id,
          0, 0, 0, 0, 0, false, 'calculated', 'open', v_payment_date, auth.uid()
        ) RETURNING id INTO v_user_payroll_id;
        
        RAISE LOG 'simple_load_operation: Created user_payroll % with payment_date %', 
          v_user_payroll_id, v_payment_date;
      END IF;
      
      BEGIN
        PERFORM recalculate_period_percentage_deductions(v_company_payment_period_id, v_driver_user_id);
        RAISE LOG 'simple_load_operation: Successfully recalculated deductions for period % and user %', 
          v_company_payment_period_id, v_driver_user_id;
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE WARNING 'simple_load_operation: Error recalculating deductions for period % and user %: %', 
            v_company_payment_period_id, v_driver_user_id, SQLERRM;
      END;
      
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE WARNING 'simple_load_operation: Error calculating payroll for user %: %', 
            v_user_payroll_id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'load', jsonb_build_object(
      'id', v_load_id,
      'company_payment_period_id', v_company_payment_period_id,
      'user_payroll_id', v_user_payroll_id,
      'payment_date', v_payment_date
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
