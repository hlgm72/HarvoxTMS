-- Fix the column reference error in calculate_driver_payment_period_v2
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_v2(period_calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_record RECORD;
  driver_id UUID;
  company_id UUID;
  gross_earnings NUMERIC := 0;
  fuel_expenses NUMERIC := 0;
  total_deductions NUMERIC := 0;
  other_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  total_income NUMERIC := 0;
  has_negative_balance BOOLEAN := false;
  deduction_result JSONB;
BEGIN
  -- Get period info
  SELECT 
    dpc.*, 
    cpp.period_start_date, 
    cpp.period_end_date, 
    cpp.company_id
  INTO period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Calculation not found');
  END IF;
  
  driver_id := period_record.driver_user_id;
  company_id := period_record.company_id;
  
  -- ✅ 1. CALCULAR GROSS EARNINGS (suma de todas las cargas)
  SELECT COALESCE(SUM(l.total_amount), 0) INTO gross_earnings
  FROM loads l
  WHERE l.driver_user_id = driver_id
    AND l.status IN ('created', 'assigned', 'in_transit', 'delivered', 'completed')
    AND (
      l.payment_period_id = period_record.company_payment_period_id
      OR
      (l.created_at >= period_record.period_start_date AND l.created_at <= period_record.period_end_date + interval '1 day')
    );
  
  -- ✅ 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = driver_id
    AND fe.payment_period_id = period_calculation_id;
  
  -- ✅ 3. CALCULAR OTHER INCOME - FIX: usar user_id en lugar de driver_user_id
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income
  FROM other_income oi
  WHERE oi.user_id = driver_id
    AND oi.payment_period_id = period_calculation_id;
  
  -- ✅ 4. GENERAR DESCUENTOS PORCENTUALES PRIMERO
  SELECT generate_load_percentage_deductions_v2(period_calculation_id) INTO deduction_result;
  
  -- ✅ 5. CALCULAR TOTAL DEDUCTIONS (incluyendo los porcentuales recién generados)
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
  
  -- ✅ 6. CALCULAR TOTALES FINALES
  total_income := gross_earnings + other_income;
  net_payment := total_income - fuel_expenses - total_deductions;
  has_negative_balance := net_payment < 0;
  
  -- ✅ 7. ACTUALIZAR EL REGISTRO DE CÁLCULO
  UPDATE driver_period_calculations SET
    gross_earnings = calculate_driver_payment_period_v2.gross_earnings,
    fuel_expenses = calculate_driver_payment_period_v2.fuel_expenses,
    total_deductions = calculate_driver_payment_period_v2.total_deductions,
    other_income = calculate_driver_payment_period_v2.other_income,
    total_income = calculate_driver_payment_period_v2.total_income,
    net_payment = calculate_driver_payment_period_v2.net_payment,
    has_negative_balance = calculate_driver_payment_period_v2.has_negative_balance,
    calculated_at = now(),
    calculated_by = auth.uid(),
    updated_at = now()
  WHERE id = period_calculation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Driver payment period calculated successfully',
    'calculation_id', period_calculation_id,
    'driver_id', driver_id,
    'gross_earnings', gross_earnings,
    'fuel_expenses', fuel_expenses,
    'total_deductions', total_deductions,
    'other_income', other_income,
    'total_income', total_income,
    'net_payment', net_payment,
    'has_negative_balance', has_negative_balance,
    'deduction_details', deduction_result
  );
END;
$$;