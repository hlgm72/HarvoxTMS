-- 🚨 FIX CRÍTICO DEFINITIVO: Corregir búsqueda de expense_instances
-- El problema: expense_instances.payment_period_id apunta a driver_period_calculations.id
-- NO a company_payment_periods.id

CREATE OR REPLACE FUNCTION calculate_driver_payment_no_auth(calculation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      RAISE NOTICE 'Dispatching deduction: $% ({}%)', (load_record.total_amount * load_record.dispatching_percentage / 100), load_record.dispatching_percentage;
    END IF;
    
    IF load_record.factoring_percentage > 0 THEN
      calculated_deductions := calculated_deductions + (load_record.total_amount * load_record.factoring_percentage / 100);
      RAISE NOTICE 'Factoring deduction: $% ({}%)', (load_record.total_amount * load_record.factoring_percentage / 100), load_record.factoring_percentage;
    END IF;
    
    IF load_record.leasing_percentage > 0 THEN
      calculated_deductions := calculated_deductions + (load_record.total_amount * load_record.leasing_percentage / 100);
      RAISE NOTICE 'Leasing deduction: $% ({}%)', (load_record.total_amount * load_record.leasing_percentage / 100), load_record.leasing_percentage;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total gross earnings: $%', calculated_gross;
  RAISE NOTICE 'Total percentage deductions: $%', calculated_deductions;

  -- 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO calculated_fuel
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
  AND fe.payment_period_id = calc_record.company_payment_period_id;

  RAISE NOTICE 'Total fuel expenses: $%', calculated_fuel;

  -- 3. 🚨 FIX CRÍTICO DEFINITIVO: CALCULAR EXPENSE INSTANCES correctamente
  -- expense_instances.payment_period_id apunta a driver_period_calculations.id
  SELECT COALESCE(SUM(ei.amount), 0) INTO additional_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calc_record.driver_user_id
  AND ei.payment_period_id = calculation_id  -- ✅ CORRECTO: usar calculation_id
  AND ei.status = 'applied';
  
  -- Sumar deducciones adicionales
  calculated_deductions := calculated_deductions + additional_deductions;
  
  RAISE NOTICE 'Additional deductions (expense_instances): $%', additional_deductions;
  RAISE NOTICE 'Total deductions: $%', calculated_deductions;

  -- 4. CALCULAR OTHER INCOME
  calculated_other_income := 0;

  -- 5. CALCULAR TOTALES FINALES
  calculated_total_income := calculated_gross + calculated_other_income;
  calculated_net_payment := calculated_total_income - calculated_fuel - calculated_deductions;
  has_negative := calculated_net_payment < 0;

  RAISE NOTICE 'RESUMEN FINAL - Gross: $%, Fuel: $%, Total Deductions: $%, Net: $%',
    calculated_gross, calculated_fuel, calculated_deductions, calculated_net_payment;

  -- 6. ACTUALIZAR EL REGISTRO
  UPDATE driver_period_calculations
  SET
    gross_earnings = calculated_gross,
    fuel_expenses = calculated_fuel,
    total_deductions = calculated_deductions,
    other_income = calculated_other_income,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = has_negative,
    calculated_at = now(),
    updated_at = now()
  WHERE id = calculation_id;

  -- 7. DEVOLVER RESULTADO
  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calc_record.driver_user_id,
    'payment_period_id', calc_record.company_payment_period_id,
    'gross_earnings', calculated_gross,
    'fuel_expenses', calculated_fuel,
    'total_deductions', calculated_deductions,
    'other_income', calculated_other_income,
    'total_income', calculated_total_income,
    'net_payment', calculated_net_payment,
    'has_negative_balance', has_negative,
    'loads_processed', (
      SELECT COUNT(*) FROM loads l
      WHERE l.driver_user_id = calc_record.driver_user_id
      AND l.payment_period_id = calc_record.company_payment_period_id
      AND l.status NOT IN ('canceled', 'cancelled')
      AND l.total_amount IS NOT NULL
      AND l.total_amount > 0
    ),
    'period_dates', jsonb_build_object(
      'start', period_start_date,
      'end', period_end_date
    )
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en cálculo del conductor: %', SQLERRM;
END;
$$;