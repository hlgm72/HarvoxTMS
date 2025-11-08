
-- Corregir el orden de operaciones en las funciones de pago
-- PRIMERO actualizar transacciones (fuel, income, expenses)
-- DESPUÉS marcar el payroll como paid

-- 1. Corregir mark_driver_as_paid_with_validation
CREATE OR REPLACE FUNCTION mark_driver_as_paid_with_validation(
  p_calculation_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_payment_date DATE;
  v_result JSONB;
  v_updated_loads INTEGER := 0;
  v_updated_fuel INTEGER := 0;
  v_updated_income INTEGER := 0;
  v_updated_expenses INTEGER := 0;
BEGIN
  v_payment_date := CURRENT_DATE;
  
  SELECT user_id, company_payment_period_id 
  INTO v_user_id, v_period_id
  FROM user_payrolls 
  WHERE id = p_calculation_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CALCULATION_NOT_FOUND'
    );
  END IF;

  -- PASO 1: Actualizar todas las transacciones PRIMERO (antes de marcar como paid)
  
  -- 1.1 Marcar loads como 'applied'
  UPDATE loads
  SET 
    payment_status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status = 'approved';
  
  GET DIAGNOSTICS v_updated_loads = ROW_COUNT;

  -- 1.2 Marcar fuel_expenses como 'applied'
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_fuel = ROW_COUNT;

  -- 1.3 Marcar other_income como 'applied'
  UPDATE other_income
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_income = ROW_COUNT;

  -- 1.4 Marcar expense_instances como 'applied'
  UPDATE expense_instances
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('planned', 'approved');

  GET DIAGNOSTICS v_updated_expenses = ROW_COUNT;

  -- PASO 2: AHORA SÍ marcar el payroll como paid (después de todas las transacciones)
  UPDATE user_payrolls
  SET 
    payment_status = 'paid',
    payment_date = v_payment_date,
    payment_method = p_payment_method,
    payment_reference = p_payment_reference,
    payment_notes = p_notes,
    updated_at = now()
  WHERE id = p_calculation_id
    AND payment_status != 'paid';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CALCULATION_ALREADY_PAID'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'PAYMENT_PROCESSED',
    'payment_date', v_payment_date,
    'updated_loads', v_updated_loads,
    'updated_fuel', v_updated_fuel,
    'updated_income', v_updated_income,
    'updated_expenses', v_updated_expenses
  );
END;
$$;

-- 2. Corregir mark_multiple_drivers_as_paid_with_validation
CREATE OR REPLACE FUNCTION mark_multiple_drivers_as_paid_with_validation(
  p_calculation_ids UUID[],
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calc_id UUID;
  v_user_id UUID;
  v_period_id UUID;
  v_payment_date DATE;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_updated_loads INTEGER := 0;
  v_updated_fuel INTEGER := 0;
  v_updated_income INTEGER := 0;
  v_updated_expenses INTEGER := 0;
  v_count_this_calc INTEGER;
BEGIN
  v_payment_date := CURRENT_DATE;

  FOREACH v_calc_id IN ARRAY p_calculation_ids
  LOOP
    BEGIN
      SELECT user_id, company_payment_period_id 
      INTO v_user_id, v_period_id
      FROM user_payrolls 
      WHERE id = v_calc_id;

      IF v_user_id IS NULL THEN
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'calculation_id', v_calc_id,
          'error', 'CALCULATION_NOT_FOUND'
        );
        CONTINUE;
      END IF;

      -- PASO 1: Actualizar transacciones PRIMERO
      
      -- 1.1 Marcar loads como 'applied'
      UPDATE loads
      SET 
        payment_status = 'applied',
        updated_at = now()
      WHERE driver_user_id = v_user_id
        AND payment_period_id = v_period_id
        AND payment_status = 'approved';
      
      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_loads := v_updated_loads + v_count_this_calc;

      -- 1.2 Marcar fuel_expenses como 'applied'
      UPDATE fuel_expenses
      SET 
        status = 'applied',
        updated_at = now()
      WHERE driver_user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status IN ('pending', 'approved');

      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_fuel := v_updated_fuel + v_count_this_calc;

      -- 1.3 Marcar other_income como 'applied'
      UPDATE other_income
      SET 
        status = 'applied',
        updated_at = now()
      WHERE user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status IN ('pending', 'approved');

      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_income := v_updated_income + v_count_this_calc;

      -- 1.4 Marcar expense_instances como 'applied'
      UPDATE expense_instances
      SET 
        status = 'applied',
        updated_at = now()
      WHERE user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status IN ('planned', 'approved');

      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_expenses := v_updated_expenses + v_count_this_calc;

      -- PASO 2: AHORA marcar payroll como paid
      UPDATE user_payrolls
      SET 
        payment_status = 'paid',
        payment_date = v_payment_date,
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        payment_notes = p_notes,
        updated_at = now()
      WHERE id = v_calc_id
        AND payment_status != 'paid';

      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'calculation_id', v_calc_id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'success_count', v_success_count,
    'error_count', v_error_count,
    'errors', v_errors,
    'updated_loads', v_updated_loads,
    'updated_fuel', v_updated_fuel,
    'updated_income', v_updated_income,
    'updated_expenses', v_updated_expenses
  );
END;
$$;

COMMENT ON FUNCTION mark_driver_as_paid_with_validation IS 
  'Marca un conductor como pagado. IMPORTANTE: Actualiza las transacciones (loads, fuel, income, expenses) ANTES de marcar el payroll como paid para evitar conflictos con los triggers de inmutabilidad.';

COMMENT ON FUNCTION mark_multiple_drivers_as_paid_with_validation IS 
  'Marca múltiples conductores como pagados. IMPORTANTE: Actualiza las transacciones (loads, fuel, income, expenses) ANTES de marcar cada payroll como paid para evitar conflictos con los triggers de inmutabilidad.';
