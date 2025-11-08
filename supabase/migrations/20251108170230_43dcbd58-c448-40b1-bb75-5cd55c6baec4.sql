-- Actualizar la función de pago múltiple para ser consistente
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

      -- 2. Marcar fuel_expenses como 'applied' (desde pending o approved)
      UPDATE fuel_expenses
      SET 
        status = 'applied',
        updated_at = now()
      WHERE driver_user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status IN ('pending', 'approved');

      GET DIAGNOSTICS v_count_this_calc = ROW_COUNT;
      v_updated_fuel := v_updated_fuel + v_count_this_calc;

      -- 3. Marcar other_income como 'applied' (desde pending o approved)
      UPDATE other_income
      SET 
        status = 'applied',
        updated_at = now()
      WHERE user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status IN ('pending', 'approved');

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