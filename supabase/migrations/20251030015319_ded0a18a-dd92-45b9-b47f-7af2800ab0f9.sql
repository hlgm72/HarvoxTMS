-- Corregir nombre de columna en other_income: es user_id no driver_user_id

DROP FUNCTION IF EXISTS public.mark_driver_as_paid_with_validation(UUID, TEXT, TEXT, TEXT);

CREATE FUNCTION public.mark_driver_as_paid_with_validation(
  p_calculation_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_payment_date DATE;
  v_updated_loads INTEGER;
  v_updated_fuel INTEGER;
  v_updated_income INTEGER;
  v_updated_deductions INTEGER;
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

  -- 1. Marcar loads como 'applied'
  UPDATE loads
  SET 
    payment_status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_loads = ROW_COUNT;

  -- 2. Marcar fuel_expenses como 'applied'
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_fuel = ROW_COUNT;

  -- 3. Marcar other_income como 'applied' (usa user_id no driver_user_id)
  UPDATE other_income
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_income = ROW_COUNT;

  -- 4. Marcar expense_instances como 'applied'
  UPDATE expense_instances
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_deductions = ROW_COUNT;

  -- 5. Marcar el payroll como 'paid'
  UPDATE user_payrolls
  SET 
    payment_status = 'paid',
    payment_date = v_payment_date,
    payment_method = p_payment_method,
    payment_reference = p_payment_reference,
    payment_notes = p_notes,
    paid_at = now(),
    paid_by = auth.uid(),
    updated_at = now()
  WHERE id = p_calculation_id
    AND payment_status != 'paid';

  RETURN jsonb_build_object(
    'success', true,
    'updated_loads', v_updated_loads,
    'updated_fuel', v_updated_fuel,
    'updated_income', v_updated_income,
    'updated_deductions', v_updated_deductions
  );
END;
$$;