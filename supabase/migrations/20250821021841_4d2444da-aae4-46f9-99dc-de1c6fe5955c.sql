-- Fix the calculate_driver_payment_period_v2 function to include recurring expenses generation
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_v2(period_calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  driver_id UUID;
  company_id UUID;
  v_gross_earnings NUMERIC := 0;
  v_fuel_expenses NUMERIC := 0;
  v_total_deductions NUMERIC := 0;
  v_other_income NUMERIC := 0;
  v_net_payment NUMERIC := 0;
  v_total_income NUMERIC := 0;
  v_has_negative_balance BOOLEAN := false;
  deduction_result JSONB;
  recurring_result JSONB;
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
  SELECT COALESCE(SUM(l.total_amount), 0) INTO v_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = driver_id
    AND l.status IN ('created', 'assigned', 'in_transit', 'delivered', 'completed')
    AND (
      l.payment_period_id = period_record.company_payment_period_id
      OR
      (l.created_at >= period_record.period_start_date AND l.created_at <= period_record.period_end_date + interval '1 day')
    );
  
  -- ✅ 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO v_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = driver_id
    AND fe.payment_period_id = period_calculation_id;
  
  -- ✅ 3. CALCULAR OTHER INCOME
  SELECT COALESCE(SUM(oi.amount), 0) INTO v_other_income
  FROM other_income oi
  WHERE oi.user_id = driver_id
    AND oi.payment_period_id = period_calculation_id;
  
  -- ✅ 4. GENERAR GASTOS RECURRENTES AUTOMÁTICAMENTE
  SELECT generate_recurring_expenses_for_period_fixed(period_record.company_payment_period_id) INTO recurring_result;
  
  -- ✅ 5. GENERAR DESCUENTOS PORCENTUALES
  SELECT generate_load_percentage_deductions_v2(period_calculation_id) INTO deduction_result;
  
  -- ✅ 6. CALCULAR TOTAL DEDUCTIONS (incluyendo los recurrentes y porcentuales recién generados)
  SELECT COALESCE(SUM(ei.amount), 0) INTO v_total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
  
  -- ✅ 7. CALCULAR TOTALES FINALES
  v_total_income := v_gross_earnings + v_other_income;
  v_net_payment := v_total_income - v_fuel_expenses - v_total_deductions;
  v_has_negative_balance := v_net_payment < 0;
  
  -- ✅ 8. ACTUALIZAR EL REGISTRO DE CÁLCULO
  UPDATE driver_period_calculations SET
    gross_earnings = v_gross_earnings,
    fuel_expenses = v_fuel_expenses,
    total_deductions = v_total_deductions,
    other_income = v_other_income,
    total_income = v_total_income,
    net_payment = v_net_payment,
    has_negative_balance = v_has_negative_balance,
    calculated_at = now(),
    calculated_by = auth.uid(),
    updated_at = now()
  WHERE id = period_calculation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Driver payment period calculated successfully',
    'calculation_id', period_calculation_id,
    'driver_id', driver_id,
    'gross_earnings', v_gross_earnings,
    'fuel_expenses', v_fuel_expenses,
    'total_deductions', v_total_deductions,
    'other_income', v_other_income,
    'total_income', v_total_income,
    'net_payment', v_net_payment,
    'has_negative_balance', v_has_negative_balance,
    'recurring_expenses', recurring_result,
    'deduction_details', deduction_result
  );
END;
$function$;