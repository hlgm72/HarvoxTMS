-- 🚨 REESCRITURA COMPLETA: Eliminar TODA ambigüedad de columnas
-- Usar nombres únicos para TODAS las variables

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_v2(period_calculation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calc_record RECORD;
  comp_record RECORD;
  var_gross_earnings NUMERIC := 0;
  var_fuel_expenses NUMERIC := 0;
  var_total_deductions NUMERIC := 0;
  var_other_income NUMERIC := 0;
  var_total_income NUMERIC := 0;
  var_net_payment NUMERIC := 0;
  var_has_negative BOOLEAN := false;
  var_factoring_deduction NUMERIC := 0;
  var_dispatching_deduction NUMERIC := 0;
  var_leasing_deduction NUMERIC := 0;
  var_expense_deductions NUMERIC := 0;
  calc_result JSONB;
BEGIN
  -- Obtener el registro del cálculo
  SELECT * INTO calc_record
  FROM driver_period_calculations dpc
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado: %', period_calculation_id;
  END IF;

  -- Obtener datos de la empresa
  SELECT * INTO comp_record
  FROM companies c
  JOIN company_payment_periods cpp ON c.id = cpp.company_id
  WHERE cpp.id = calc_record.company_payment_period_id;

  -- 1. CALCULAR GROSS EARNINGS
  SELECT COALESCE(SUM(l.total_amount), 0) INTO var_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.payment_period_id = calc_record.company_payment_period_id
    AND l.status = 'delivered';

  -- 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO var_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
    AND fe.payment_period_id = calc_record.company_payment_period_id;

  -- 3. CALCULAR OTHER INCOME
  BEGIN
    SELECT COALESCE(SUM(oi.amount), 0) INTO var_other_income
    FROM other_income oi
    WHERE oi.user_id = calc_record.driver_user_id 
      AND oi.payment_period_id = calc_record.company_payment_period_id;
  EXCEPTION WHEN OTHERS THEN
    var_other_income := 0;
  END;

  -- 4. CALCULAR DEDUCCIONES POR PARTES
  -- Factoring
  IF comp_record.default_factoring_percentage IS NOT NULL AND comp_record.default_factoring_percentage > 0 THEN
    var_factoring_deduction := var_gross_earnings * comp_record.default_factoring_percentage / 100;
  END IF;
  
  -- Dispatching
  IF comp_record.default_dispatching_percentage IS NOT NULL AND comp_record.default_dispatching_percentage > 0 THEN
    var_dispatching_deduction := var_gross_earnings * comp_record.default_dispatching_percentage / 100;
  END IF;
  
  -- Leasing
  IF comp_record.default_leasing_percentage IS NOT NULL AND comp_record.default_leasing_percentage > 0 THEN
    var_leasing_deduction := var_gross_earnings * comp_record.default_leasing_percentage / 100;
  END IF;

  -- Expense instances
  SELECT COALESCE(SUM(ei.amount), 0) INTO var_expense_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calc_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';

  -- Total de deducciones
  var_total_deductions := var_factoring_deduction + var_dispatching_deduction + var_leasing_deduction + var_expense_deductions;

  -- 5. CALCULAR TOTALES FINALES
  var_total_income := var_gross_earnings + var_other_income;
  var_net_payment := var_total_income - var_fuel_expenses - var_total_deductions;
  var_has_negative := var_net_payment < 0;

  -- 6. ACTUALIZAR EL REGISTRO (usar nombres de columna explícitos)
  UPDATE driver_period_calculations
  SET 
    gross_earnings = var_gross_earnings,
    fuel_expenses = var_fuel_expenses,
    total_deductions = var_total_deductions,
    other_income = var_other_income,
    total_income = var_total_income,
    net_payment = var_net_payment,
    has_negative_balance = var_has_negative,
    updated_at = now()
  WHERE id = period_calculation_id;

  -- 7. PREPARAR RESULTADO
  calc_result := jsonb_build_object(
    'success', true,
    'calculation_id', period_calculation_id,
    'driver_user_id', calc_record.driver_user_id,
    'gross_earnings', var_gross_earnings,
    'fuel_expenses', var_fuel_expenses,
    'total_deductions', var_total_deductions,
    'other_income', var_other_income,
    'total_income', var_total_income,
    'net_payment', var_net_payment,
    'has_negative_balance', var_has_negative,
    'calculated_at', now()
  );

  RAISE LOG 'calculate_driver_payment_period_v2 COMPLETED: driver=%, period=%, gross=%, deductions=%, net=%', 
    calc_record.driver_user_id, calc_record.company_payment_period_id, var_gross_earnings, var_total_deductions, var_net_payment;

  RETURN calc_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error calculando período de pago: %', SQLERRM;
END;
$$;