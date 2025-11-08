-- Actualizar funciones para marcar TODAS las transacciones como 'applied'
-- Incluir other_income y expense_instances además de loads y fuel_expenses

-- 1. Actualizar mark_driver_as_paid_with_validation
DROP FUNCTION IF EXISTS mark_driver_as_paid_with_validation(UUID, TEXT, TEXT, TEXT);

CREATE FUNCTION mark_driver_as_paid_with_validation(
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
  v_updated_loads INTEGER;
  v_updated_fuel INTEGER;
  v_updated_income INTEGER;
  v_updated_expenses INTEGER;
BEGIN
  SELECT user_id, company_payment_period_id 
  INTO v_user_id, v_period_id
  FROM user_payrolls 
  WHERE id = p_calculation_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CALCULATION_NOT_FOUND'
    );
  END IF;

  v_payment_date := CURRENT_DATE;

  -- Actualizar el payroll
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

  -- 1. Marcar loads como 'applied' (inmutables)
  UPDATE loads
  SET 
    payment_status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status = 'approved';

  GET DIAGNOSTICS v_updated_loads = ROW_COUNT;

  -- 2. Marcar fuel_expenses como 'applied'
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status = 'approved';

  GET DIAGNOSTICS v_updated_fuel = ROW_COUNT;

  -- 3. Marcar other_income como 'applied'
  UPDATE other_income
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status = 'approved';

  GET DIAGNOSTICS v_updated_income = ROW_COUNT;

  -- 4. Marcar expense_instances como 'applied'
  UPDATE expense_instances
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('planned', 'approved');

  GET DIAGNOSTICS v_updated_expenses = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_loads', v_updated_loads,
    'updated_fuel', v_updated_fuel,
    'updated_income', v_updated_income,
    'updated_expenses', v_updated_expenses
  );
END;
$$;

-- 2. Actualizar mark_multiple_drivers_as_paid_with_validation
DROP FUNCTION IF EXISTS mark_multiple_drivers_as_paid_with_validation(UUID[], TEXT, TEXT, TEXT);

CREATE FUNCTION mark_multiple_drivers_as_paid_with_validation(
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

      -- Actualizar payroll
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

      -- 1. Marcar loads como 'applied'
      UPDATE loads
      SET 
        payment_status = 'applied',
        updated_at = now()
      WHERE driver_user_id = v_user_id
        AND payment_period_id = v_period_id
        AND payment_status = 'approved';
      
      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_loads := v_updated_loads + v_count_this_calc;

      -- 2. Marcar fuel_expenses como 'applied'
      UPDATE fuel_expenses
      SET 
        status = 'applied',
        updated_at = now()
      WHERE driver_user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status = 'approved';

      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_fuel := v_updated_fuel + v_count_this_calc;

      -- 3. Marcar other_income como 'applied'
      UPDATE other_income
      SET 
        status = 'applied',
        updated_at = now()
      WHERE user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status = 'approved';

      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_income := v_updated_income + v_count_this_calc;

      -- 4. Marcar expense_instances como 'applied'
      UPDATE expense_instances
      SET 
        status = 'applied',
        updated_at = now()
      WHERE user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status IN ('planned', 'approved');

      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_expenses := v_updated_expenses + v_count_this_calc;

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

COMMENT ON FUNCTION mark_driver_as_paid_with_validation IS 'Marca payroll como pagado y actualiza payment_status de TODAS las transacciones (loads, fuel_expenses, other_income, expense_instances) a applied (inmutable)';
COMMENT ON FUNCTION mark_multiple_drivers_as_paid_with_validation IS 'Marca múltiples payrolls como pagados y actualiza payment_status de TODAS las transacciones a applied';