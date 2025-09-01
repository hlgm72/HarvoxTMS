-- 🚨 CORRECCIÓN: Cálculo de deducciones en driver_period_calculations
-- El problema: Las deducciones recurrentes se crean en expense_instances pero no se reflejan correctamente
-- en el total_deductions de driver_period_calculations

-- Función corregida para calcular correctamente las deducciones incluyendo expense_instances
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_v2(period_calculation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculation_record RECORD;
  company_record RECORD;
  total_gross NUMERIC := 0;
  total_fuel NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  result JSONB;
BEGIN
  -- Obtener el registro del cálculo
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado: %', period_calculation_id;
  END IF;

  -- Obtener datos de la empresa para porcentajes
  SELECT * INTO company_record
  FROM companies c
  JOIN company_payment_periods cpp ON c.id = cpp.company_id
  WHERE cpp.id = calculation_record.company_payment_period_id;

  -- 1. CALCULAR GROSS EARNINGS (desde loads)
  SELECT COALESCE(SUM(l.rate), 0) INTO total_gross
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = calculation_record.company_payment_period_id
    AND l.status = 'delivered';

  -- 2. CALCULAR FUEL EXPENSES (desde fuel_expenses)
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = calculation_record.company_payment_period_id;

  -- 3. CALCULAR OTHER INCOME (desde other_income)
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.driver_user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = calculation_record.company_payment_period_id;

  -- 4. 🚨 CALCULAR DEDUCCIONES CORRECTAMENTE
  -- 4a. Deducciones de porcentaje de la empresa (si existen)
  total_deductions := 0;
  
  IF company_record.default_percentage_deduction IS NOT NULL AND company_record.default_percentage_deduction > 0 THEN
    total_deductions := total_deductions + (total_gross * company_record.default_percentage_deduction / 100);
  END IF;

  -- 4b. 🚨 DEDUCCIONES DE EXPENSE_INSTANCES (incluyendo recurrentes)
  -- Esta es la parte que faltaba - sumar todas las expense_instances para este driver y período
  SELECT total_deductions + COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id  -- payment_period_id apunta al driver_period_calculation.id
    AND ei.status = 'applied';

  -- 5. CALCULAR TOTALES
  total_income := total_gross + total_other_income;
  net_payment := total_income - total_fuel - total_deductions;
  has_negative := net_payment < 0;

  -- 6. ACTUALIZAR EL REGISTRO
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_gross,
    fuel_expenses = total_fuel,
    total_deductions = total_deductions,
    other_income = total_other_income,
    total_income = total_income,
    net_payment = net_payment,
    has_negative_balance = has_negative,
    updated_at = now()
  WHERE id = period_calculation_id;

  -- 7. PREPARAR RESULTADO
  result := jsonb_build_object(
    'success', true,
    'calculation_id', period_calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'gross_earnings', total_gross,
    'fuel_expenses', total_fuel,
    'total_deductions', total_deductions,
    'other_income', total_other_income,
    'total_income', total_income,
    'net_payment', net_payment,
    'has_negative_balance', has_negative,
    'calculated_at', now()
  );

  RAISE LOG 'calculate_driver_payment_period_v2: Completed calculation for driver % in period %. Gross: %, Deductions: %, Net: %', 
    calculation_record.driver_user_id, calculation_record.company_payment_period_id, total_gross, total_deductions, net_payment;

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error calculando período de pago: %', SQLERRM;
END;
$$;