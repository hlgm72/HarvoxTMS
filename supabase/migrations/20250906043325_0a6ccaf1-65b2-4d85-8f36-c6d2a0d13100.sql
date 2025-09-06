-- ARREGLAR ERROR: Ambigüedad en total_deductions
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_no_auth(
  calculation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_record RECORD;
  total_gross NUMERIC := 0;
  total_fuel NUMERIC := 0;
  total_deductions NUMERIC := 0;
  additional_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  load_record RECORD;
  period_start_date DATE;
  period_end_date DATE;
  company_id UUID;
BEGIN
  -- Obtener el cálculo
  SELECT * INTO calc_record
  FROM driver_period_calculations dpc
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calculation not found: %', calculation_id;
  END IF;

  -- Obtener datos del período por separado
  SELECT cpp.period_start_date, cpp.period_end_date, cpp.company_id
  INTO period_start_date, period_end_date, company_id
  FROM company_payment_periods cpp
  WHERE cpp.id = calc_record.company_payment_period_id;

  RAISE NOTICE 'Calculando para driver % en período % (%-%)', 
    calc_record.driver_user_id, calc_record.company_payment_period_id,
    period_start_date, period_end_date;

  -- 1. CALCULAR GROSS EARNINGS de loads (todos los status menos canceled)
  FOR load_record IN
    SELECT l.*
    FROM loads l
    WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.payment_period_id = calc_record.company_payment_period_id
    AND l.status NOT IN ('canceled', 'cancelled')
    AND l.total_amount IS NOT NULL
    AND l.total_amount > 0
  LOOP
    RAISE NOTICE 'Procesando load %: $% (status: %)', 
      load_record.load_number, load_record.total_amount, load_record.status;
    
    -- Sumar gross earnings
    total_gross := total_gross + load_record.total_amount;
    
    -- Calcular deducciones automáticas por porcentajes
    IF load_record.dispatching_percentage > 0 THEN
      total_deductions := total_deductions + (load_record.total_amount * load_record.dispatching_percentage / 100);
    END IF;
    
    IF load_record.factoring_percentage > 0 THEN
      total_deductions := total_deductions + (load_record.total_amount * load_record.factoring_percentage / 100);
    END IF;
    
    IF load_record.leasing_percentage > 0 THEN
      total_deductions := total_deductions + (load_record.total_amount * load_record.leasing_percentage / 100);
    END IF;
  END LOOP;

  -- 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
  AND fe.payment_period_id = calc_record.company_payment_period_id;

  RAISE NOTICE 'Total fuel expenses: $%', total_fuel;

  -- 3. CALCULAR EXPENSE INSTANCES (deducciones adicionales)
  SELECT COALESCE(SUM(ei.amount), 0) INTO additional_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calc_record.driver_user_id
  AND ei.payment_period_id = calculation_id
  AND ei.status = 'applied';
  
  -- Sumar deducciones adicionales
  total_deductions := total_deductions + additional_deductions;
  
  RAISE NOTICE 'Total additional deductions: $%', additional_deductions;

  -- 4. CALCULAR TOTALES
  total_income := total_gross + total_other_income;
  net_payment := total_income - total_fuel - total_deductions;
  has_negative := net_payment < 0;

  RAISE NOTICE 'CÁLCULO FINAL: Gross=$%, Fuel=$%, Deductions=$%, Net=$%', 
    total_gross, total_fuel, total_deductions, net_payment;

  -- 5. ACTUALIZAR EL RECORD
  UPDATE driver_period_calculations SET
    gross_earnings = total_gross,
    fuel_expenses = total_fuel,
    total_deductions = total_deductions,
    other_income = total_other_income,
    total_income = total_income,
    net_payment = net_payment,
    has_negative_balance = has_negative,
    calculated_at = now(),
    payment_status = CASE 
      WHEN net_payment < 0 THEN 'calculated'
      ELSE 'calculated'
    END,
    updated_at = now()
  WHERE id = calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calc_record.driver_user_id,
    'period_id', calc_record.company_payment_period_id,
    'gross_earnings', total_gross,
    'fuel_expenses', total_fuel,
    'total_deductions', total_deductions,
    'net_payment', net_payment,
    'has_negative_balance', has_negative,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR en calculate_driver_payment_no_auth: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'calculation_id', calculation_id
  );
END;
$$;

-- PROBAR INMEDIATAMENTE
SELECT calculate_driver_payment_no_auth(dpc.id) as test_result
FROM driver_period_calculations dpc
JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id  
WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
AND cpp.id = '91f545d0-0bd7-40ce-b61a-10f402a96bb5';