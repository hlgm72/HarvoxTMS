-- Crear función de recálculo para user_payrolls
CREATE OR REPLACE FUNCTION public.calculate_user_payment_period_with_validation(
  calculation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_calculation RECORD;
  v_period RECORD;
  v_total_loads NUMERIC := 0;
  v_total_fuel NUMERIC := 0;
  v_total_deductions NUMERIC := 0;
  v_other_income NUMERIC := 0;
  v_result JSONB;
BEGIN
  -- Obtener el cálculo
  SELECT * INTO v_calculation
  FROM user_payrolls
  WHERE id = calculation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calculation not found: %', calculation_id;
  END IF;
  
  -- Obtener el período
  SELECT * INTO v_period
  FROM company_payment_periods
  WHERE id = v_calculation.company_payment_period_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment period not found';
  END IF;
  
  -- Calcular total de cargas
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_loads
  FROM loads
  WHERE driver_user_id = v_calculation.user_id
  AND payment_period_id = v_calculation.company_payment_period_id
  AND status = 'completed';
  
  -- Calcular total de combustible
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_fuel
  FROM fuel_expenses
  WHERE driver_user_id = v_calculation.user_id
  AND payment_period_id = calculation_id
  AND status = 'approved';
  
  -- Calcular total de deducciones
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
  FROM expense_instances
  WHERE user_id = v_calculation.user_id
  AND payment_period_id = calculation_id;
  
  -- Calcular otros ingresos (si los hay)
  v_other_income := COALESCE(v_calculation.other_income, 0);
  
  -- Actualizar el cálculo
  UPDATE user_payrolls
  SET
    gross_earnings = v_total_loads,
    fuel_expenses = v_total_fuel,
    total_deductions = v_total_deductions,
    other_income = v_other_income,
    net_payment = (v_total_loads + v_other_income) - (v_total_fuel + v_total_deductions),
    has_negative_balance = ((v_total_loads + v_other_income) - (v_total_fuel + v_total_deductions)) < 0,
    updated_at = now()
  WHERE id = calculation_id;
  
  -- Construir resultado
  v_result := jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'gross_earnings', v_total_loads,
    'fuel_expenses', v_total_fuel,
    'total_deductions', v_total_deductions,
    'other_income', v_other_income,
    'net_payment', (v_total_loads + v_other_income) - (v_total_fuel + v_total_deductions),
    'updated_at', now()
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error recalculating payment period: %', SQLERRM;
END;
$$;