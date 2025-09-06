-- ARREGLAR ERROR: Usar variables con nombres únicos para evitar ambigüedad
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_no_auth(
  calculation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_record RECORD;
  calc_gross NUMERIC := 0;
  calc_fuel NUMERIC := 0;
  calc_deductions NUMERIC := 0;
  calc_other_income NUMERIC := 0;
  calc_total_income NUMERIC := 0;
  calc_net_payment NUMERIC := 0;
  calc_has_negative BOOLEAN := false;
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
    calc_gross := calc_gross + load_record.total_amount;
    
    -- Calcular deducciones automáticas por porcentajes
    IF load_record.dispatching_percentage > 0 THEN
      calc_deductions := calc_deductions + (load_record.total_amount * load_record.dispatching_percentage / 100);
    END IF;
    
    IF load_record.factoring_percentage > 0 THEN
      calc_deductions := calc_deductions + (load_record.total_amount * load_record.factoring_percentage / 100);
    END IF;
    
    IF load_record.leasing_percentage > 0 THEN
      calc_deductions := calc_deductions + (load_record.total_amount * load_record.leasing_percentage / 100);
    END IF;
  END LOOP;

  -- 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO calc_fuel
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
  AND fe.payment_period_id = calc_record.company_payment_period_id;

  RAISE NOTICE 'Total fuel expenses: $%', calc_fuel;

  -- 3. CALCULAR EXPENSE INSTANCES (deducciones adicionales)
  DECLARE
    additional_deductions NUMERIC := 0;
  BEGIN
    SELECT COALESCE(SUM(ei.amount), 0) INTO additional_deductions
    FROM expense_instances ei
    WHERE ei.user_id = calc_record.driver_user_id
    AND ei.payment_period_id = calculation_id
    AND ei.status = 'applied';
    
    -- Sumar deducciones adicionales
    calc_deductions := calc_deductions + additional_deductions;
    
    RAISE NOTICE 'Total additional deductions: $%', additional_deductions;
  END;

  -- 4. CALCULAR TOTALES
  calc_total_income := calc_gross + calc_other_income;
  calc_net_payment := calc_total_income - calc_fuel - calc_deductions;
  calc_has_negative := calc_net_payment < 0;

  RAISE NOTICE 'CÁLCULO FINAL: Gross=$%, Fuel=$%, Deductions=$%, Net=$%', 
    calc_gross, calc_fuel, calc_deductions, calc_net_payment;

  -- 5. ACTUALIZAR EL RECORD
  UPDATE driver_period_calculations SET
    gross_earnings = calc_gross,
    fuel_expenses = calc_fuel,
    total_deductions = calc_deductions,
    other_income = calc_other_income,
    total_income = calc_total_income,
    net_payment = calc_net_payment,
    has_negative_balance = calc_has_negative,
    calculated_at = now(),
    payment_status = CASE 
      WHEN calc_net_payment < 0 THEN 'calculated'
      ELSE 'calculated'
    END,
    updated_at = now()
  WHERE id = calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calc_record.driver_user_id,
    'period_id', calc_record.company_payment_period_id,
    'gross_earnings', calc_gross,
    'fuel_expenses', calc_fuel,
    'total_deductions', calc_deductions,
    'net_payment', calc_net_payment,
    'has_negative_balance', calc_has_negative,
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