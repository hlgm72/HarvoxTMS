-- Crear tipos de expense para los porcentajes automáticos
INSERT INTO public.expense_types (name, description, category, is_active) 
VALUES 
  ('Leasing Fee', 'Cargo por arrendamiento de equipo basado en porcentaje de carga', 'percentage_deduction', true),
  ('Factoring Fee', 'Cargo por factoraje basado en porcentaje de carga', 'percentage_deduction', true),
  ('Dispatching Fee', 'Cargo por despacho basado en porcentaje de carga', 'percentage_deduction', true)
ON CONFLICT (name) DO NOTHING;

-- Función para generar deducciones automáticas por carga
CREATE OR REPLACE FUNCTION generate_load_percentage_deductions(
  load_id_param UUID,
  period_calculation_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_record RECORD;
  leasing_expense_type_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  leasing_amount NUMERIC;
  factoring_amount NUMERIC;
  dispatching_amount NUMERIC;
BEGIN
  -- Obtener datos de la carga
  SELECT * INTO load_record
  FROM loads
  WHERE id = load_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Obtener IDs de los tipos de expense
  SELECT id INTO leasing_expense_type_id
  FROM expense_types
  WHERE name = 'Leasing Fee';
  
  SELECT id INTO factoring_expense_type_id
  FROM expense_types
  WHERE name = 'Factoring Fee';
  
  SELECT id INTO dispatching_expense_type_id
  FROM expense_types
  WHERE name = 'Dispatching Fee';
  
  -- Calcular montos de deducción
  leasing_amount := load_record.total_amount * (COALESCE(load_record.leasing_percentage, 0) / 100);
  factoring_amount := load_record.total_amount * (COALESCE(load_record.factoring_percentage, 0) / 100);
  dispatching_amount := load_record.total_amount * (COALESCE(load_record.dispatching_percentage, 0) / 100);
  
  -- Insertar deducción por leasing si hay porcentaje
  IF load_record.leasing_percentage > 0 AND leasing_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      leasing_expense_type_id,
      load_record.driver_user_id,
      leasing_amount,
      'Leasing fee for load #' || load_record.load_number || ' (' || load_record.leasing_percentage || '%)',
      COALESCE(load_record.pickup_date, load_record.delivery_date, CURRENT_DATE),
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT DO NOTHING; -- Evitar duplicados
  END IF;
  
  -- Insertar deducción por factoring si hay porcentaje
  IF load_record.factoring_percentage > 0 AND factoring_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      factoring_expense_type_id,
      load_record.driver_user_id,
      factoring_amount,
      'Factoring fee for load #' || load_record.load_number || ' (' || load_record.factoring_percentage || '%)',
      COALESCE(load_record.pickup_date, load_record.delivery_date, CURRENT_DATE),
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Insertar deducción por dispatching si hay porcentaje
  IF load_record.dispatching_percentage > 0 AND dispatching_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      dispatching_expense_type_id,
      load_record.driver_user_id,
      dispatching_amount,
      'Dispatching fee for load #' || load_record.load_number || ' (' || load_record.dispatching_percentage || '%)',
      COALESCE(load_record.pickup_date, load_record.delivery_date, CURRENT_DATE),
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
END;
$$;

-- Actualizar la función calculate_driver_payment_period para generar deducciones automáticas
CREATE OR REPLACE FUNCTION calculate_driver_payment_period(period_calculation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    calculation_record driver_period_calculations%ROWTYPE;
    load_record RECORD;
    total_gross_earnings numeric := 0;
    total_other_income numeric := 0;
    total_fuel_expenses numeric := 0;
    total_deductions_amount numeric := 0;
    net_payment numeric := 0;
    has_negative boolean := false;
    alert_msg text := '';
BEGIN
    -- Get the calculation record
    SELECT * INTO calculation_record
    FROM driver_period_calculations
    WHERE id = period_calculation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment period calculation not found';
    END IF;
    
    -- PASO 1: Limpiar deducciones automáticas existentes para evitar duplicados
    DELETE FROM expense_instances 
    WHERE payment_period_id = period_calculation_id
    AND expense_type_id IN (
      SELECT id FROM expense_types 
      WHERE name IN ('Leasing Fee', 'Factoring Fee', 'Dispatching Fee')
    );
    
    -- PASO 2: Generar deducciones automáticas para cada carga completada
    FOR load_record IN 
      SELECT id, load_number, total_amount, leasing_percentage, factoring_percentage, 
             dispatching_percentage, pickup_date, delivery_date, driver_user_id
      FROM loads l
      WHERE l.driver_user_id = calculation_record.driver_user_id
      AND l.payment_period_id = calculation_record.company_payment_period_id
      AND l.status = 'completed'
      AND (l.leasing_percentage > 0 OR l.factoring_percentage > 0 OR l.dispatching_percentage > 0)
    LOOP
      -- Generar deducciones por porcentajes para esta carga
      PERFORM generate_load_percentage_deductions(load_record.id, period_calculation_id);
    END LOOP;
    
    -- PASO 3: Calculate gross earnings from loads (total amount, sin descontar porcentajes)
    SELECT COALESCE(SUM(l.total_amount), 0) INTO total_gross_earnings
    FROM loads l
    WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = calculation_record.company_payment_period_id
    AND l.status = 'completed';
    
    -- PASO 4: Calculate other income
    SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
    FROM other_income oi
    WHERE oi.driver_user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = calculation_record.company_payment_period_id
    AND oi.status = 'approved';
    
    -- PASO 5: Calculate fuel expenses
    SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = calculation_record.company_payment_period_id
    AND fe.status = 'approved';
    
    -- PASO 6: Calculate deductions (incluyendo las automáticas recién generadas)
    SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions_amount
    FROM expense_instances ei
    WHERE ei.driver_user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
    
    -- PASO 7: Calculate net payment: (gross_earnings + other_income) - fuel_expenses - deductions
    net_payment := (total_gross_earnings + total_other_income) - total_fuel_expenses - total_deductions_amount;
    
    -- PASO 8: Check for negative balance
    has_negative := net_payment < 0;
    
    IF has_negative THEN
        alert_msg := 'El conductor tiene un balance negativo de $' || ABS(net_payment)::text;
    END IF;
    
    -- PASO 9: Update the calculation record with calculated values
    UPDATE driver_period_calculations
    SET 
        gross_earnings = total_gross_earnings,
        other_income = total_other_income,
        fuel_expenses = total_fuel_expenses,
        total_deductions = total_deductions_amount,
        has_negative_balance = has_negative,
        balance_alert_message = alert_msg,
        calculated_at = now(),
        calculated_by = auth.uid()
    WHERE id = period_calculation_id;
    
    RAISE NOTICE 'Generated percentage deductions and recalculated payment period %', period_calculation_id;
    
END;
$$;