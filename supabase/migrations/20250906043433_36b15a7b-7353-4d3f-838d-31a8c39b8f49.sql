-- ARREGLAR ERROR: Cambiar nombres de variables para evitar ambigüedad  
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_no_auth(
  calculation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_record RECORD;
  calculated_gross NUMERIC := 0;
  calculated_fuel NUMERIC := 0;
  calculated_deductions NUMERIC := 0;
  additional_deductions NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
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
    calculated_gross := calculated_gross + load_record.total_amount;
    
    -- Calcular deducciones automáticas por porcentajes
    IF load_record.dispatching_percentage > 0 THEN
      calculated_deductions := calculated_deductions + (load_record.total_amount * load_record.dispatching_percentage / 100);
    END IF;
    
    IF load_record.factoring_percentage > 0 THEN
      calculated_deductions := calculated_deductions + (load_record.total_amount * load_record.factoring_percentage / 100);
    END IF;
    
    IF load_record.leasing_percentage > 0 THEN
      calculated_deductions := calculated_deductions + (load_record.total_amount * load_record.leasing_percentage / 100);
    END IF;
  END LOOP;

  -- 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO calculated_fuel
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
  AND fe.payment_period_id = calc_record.company_payment_period_id;

  RAISE NOTICE 'Total fuel expenses: $%', calculated_fuel;

  -- 3. CALCULAR EXPENSE INSTANCES (deducciones adicionales)
  SELECT COALESCE(SUM(ei.amount), 0) INTO additional_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calc_record.driver_user_id
  AND ei.payment_period_id = calculation_id
  AND ei.status = 'applied';
  
  -- Sumar deducciones adicionales
  calculated_deductions := calculated_deductions + additional_deductions;
  
  RAISE NOTICE 'Total additional deductions: $%', additional_deductions;

  -- 4. CALCULAR TOTALES
  calculated_total_income := calculated_gross + calculated_other_income;
  calculated_net_payment := calculated_total_income - calculated_fuel - calculated_deductions;
  has_negative := calculated_net_payment < 0;

  RAISE NOTICE 'CÁLCULO FINAL: Gross=$%, Fuel=$%, Deductions=$%, Net=$%', 
    calculated_gross, calculated_fuel, calculated_deductions, calculated_net_payment;

  -- 5. ACTUALIZAR EL RECORD
  UPDATE driver_period_calculations SET
    gross_earnings = calculated_gross,
    fuel_expenses = calculated_fuel,
    total_deductions = calculated_deductions,
    other_income = calculated_other_income,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = has_negative,
    calculated_at = now(),
    payment_status = CASE 
      WHEN calculated_net_payment < 0 THEN 'calculated'
      ELSE 'calculated'
    END,
    updated_at = now()
  WHERE id = calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calc_record.driver_user_id,
    'period_id', calc_record.company_payment_period_id,
    'gross_earnings', calculated_gross,
    'fuel_expenses', calculated_fuel,
    'total_deductions', calculated_deductions,
    'net_payment', calculated_net_payment,
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