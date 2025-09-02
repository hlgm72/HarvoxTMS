-- ===============================================
-- 🚨 CORRECCIÓN CRÍTICA DE CÁLCULOS DE PAGO 
-- ===============================================
-- PROBLEMAS IDENTIFICADOS:
-- 1. Status de cargas muy restrictivo (solo 'delivered')
-- 2. Cálculo duplicado de deducciones (manual + expense_instances)
-- 3. Referencias incorrectas en consultas de expense_instances y loads
-- 
-- SOLUCIÓN: Usar solo expense_instances para deducciones y corregir filtros

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_v2(period_calculation_id UUID)
RETURNS JSONB AS $$
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
  calc_result JSONB;
  loads_count INTEGER := 0;
  fuel_count INTEGER := 0;
  expense_count INTEGER := 0;
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

  RAISE LOG 'calculate_driver_payment_period_v2: Iniciando cálculo para conductor % en período %', 
    calc_record.driver_user_id, calc_record.company_payment_period_id;

  -- 1. CALCULAR GROSS EARNINGS - CORREGIR STATUS Y REFERENCIA
  SELECT COALESCE(SUM(l.total_amount), 0), COUNT(*) 
  INTO var_gross_earnings, loads_count
  FROM loads l
  WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.payment_period_id = period_calculation_id  -- CORRECCIÓN: Referencia correcta
    AND l.status IN ('assigned', 'in_transit', 'delivered');  -- CORRECCIÓN: Más estados

  RAISE LOG 'calculate_driver_payment_period_v2: Encontradas % cargas por $%', loads_count, var_gross_earnings;

  -- 2. CALCULAR FUEL EXPENSES - CORREGIR REFERENCIA
  SELECT COALESCE(SUM(fe.total_amount), 0), COUNT(*) 
  INTO var_fuel_expenses, fuel_count
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
    AND fe.payment_period_id = period_calculation_id;  -- CORRECCIÓN: Referencia correcta

  RAISE LOG 'calculate_driver_payment_period_v2: Encontrados % gastos de combustible por $%', fuel_count, var_fuel_expenses;

  -- 3. CALCULAR OTHER INCOME
  BEGIN
    SELECT COALESCE(SUM(oi.amount), 0) INTO var_other_income
    FROM other_income oi
    WHERE oi.user_id = calc_record.driver_user_id 
      AND oi.payment_period_id = period_calculation_id;
  EXCEPTION WHEN OTHERS THEN
    var_other_income := 0;
    RAISE LOG 'calculate_driver_payment_period_v2: Tabla other_income no existe, usando 0';
  END;

  -- 4. USAR SOLO EXPENSE_INSTANCES PARA DEDUCCIONES - CORRECCIÓN CRÍTICA
  SELECT COALESCE(SUM(ei.amount), 0), COUNT(*) 
  INTO var_total_deductions, expense_count
  FROM expense_instances ei
  WHERE ei.user_id = calc_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id  -- CORRECCIÓN: Referencia correcta
    AND ei.status = 'applied';

  RAISE LOG 'calculate_driver_payment_period_v2: Encontradas % deducciones por $%', expense_count, var_total_deductions;

  -- 5. CALCULAR TOTALES FINALES
  var_total_income := var_gross_earnings + var_other_income;
  var_net_payment := var_total_income - var_fuel_expenses - var_total_deductions;
  var_has_negative := var_net_payment < 0;

  -- 6. ACTUALIZAR EL REGISTRO
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

  -- 7. PREPARAR RESULTADO CON DETALLES DE DEBUG
  calc_result := jsonb_build_object(
    'success', true,
    'calculation_id', period_calculation_id,
    'driver_user_id', calc_record.driver_user_id,
    'company_payment_period_id', calc_record.company_payment_period_id,
    'loads_count', loads_count,
    'fuel_count', fuel_count, 
    'expense_count', expense_count,
    'gross_earnings', var_gross_earnings,
    'fuel_expenses', var_fuel_expenses,
    'total_deductions', var_total_deductions,
    'other_income', var_other_income,
    'total_income', var_total_income,
    'net_payment', var_net_payment,
    'has_negative_balance', var_has_negative,
    'calculated_at', now()
  );

  RAISE LOG 'calculate_driver_payment_period_v2 COMPLETED: driver=%, period=%, loads=%, gross=%, fuel=%, deductions=%, net=%', 
    calc_record.driver_user_id, calc_record.company_payment_period_id, loads_count, var_gross_earnings, var_fuel_expenses, var_total_deductions, var_net_payment;

  RETURN calc_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error calculando período de pago: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función de limpieza para regenerar expense_instances de porcentajes
CREATE OR REPLACE FUNCTION public.regenerate_percentage_deductions_for_period(
  target_period_calculation_id UUID
) RETURNS JSONB AS $$
DECLARE
  calc_record RECORD;
  comp_record RECORD;
  var_gross_earnings NUMERIC := 0;
  var_factoring_amount NUMERIC := 0;
  var_dispatching_amount NUMERIC := 0;
  var_leasing_amount NUMERIC := 0;
  factoring_type_id UUID;
  dispatching_type_id UUID;
  leasing_type_id UUID;
  generated_count INTEGER := 0;
BEGIN
  -- Obtener datos del cálculo y empresa
  SELECT dpc.*, cpp.company_id INTO calc_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = target_period_calculation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado: %', target_period_calculation_id;
  END IF;

  SELECT * INTO comp_record
  FROM companies WHERE id = calc_record.company_id;

  -- Obtener gross earnings actual
  SELECT COALESCE(SUM(l.total_amount), 0) INTO var_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.payment_period_id = target_period_calculation_id
    AND l.status IN ('assigned', 'in_transit', 'delivered');

  RAISE LOG 'regenerate_percentage_deductions: Gross earnings: $% para período %', var_gross_earnings, target_period_calculation_id;

  -- Solo continuar si hay gross earnings
  IF var_gross_earnings > 0 THEN
    -- Obtener IDs de tipos de gastos de porcentaje
    SELECT id INTO factoring_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%factoring%' LIMIT 1;
    SELECT id INTO dispatching_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%dispatching%' LIMIT 1;
    SELECT id INTO leasing_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%leasing%' LIMIT 1;

    -- Eliminar deducciones de porcentaje existentes para este período
    DELETE FROM expense_instances
    WHERE payment_period_id = target_period_calculation_id
      AND user_id = calc_record.driver_user_id
      AND expense_type_id IN (factoring_type_id, dispatching_type_id, leasing_type_id);

    -- Generar factoring
    IF comp_record.default_factoring_percentage > 0 AND factoring_type_id IS NOT NULL THEN
      var_factoring_amount := var_gross_earnings * comp_record.default_factoring_percentage / 100;
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, status
      ) VALUES (
        target_period_calculation_id, calc_record.driver_user_id, factoring_type_id,
        var_factoring_amount, 'Factoring (' || comp_record.default_factoring_percentage || '%)', 'applied'
      );
      generated_count := generated_count + 1;
    END IF;

    -- Generar dispatching
    IF comp_record.default_dispatching_percentage > 0 AND dispatching_type_id IS NOT NULL THEN
      var_dispatching_amount := var_gross_earnings * comp_record.default_dispatching_percentage / 100;
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, status
      ) VALUES (
        target_period_calculation_id, calc_record.driver_user_id, dispatching_type_id,
        var_dispatching_amount, 'Dispatching (' || comp_record.default_dispatching_percentage || '%)', 'applied'
      );
      generated_count := generated_count + 1;
    END IF;

    -- Generar leasing
    IF comp_record.default_leasing_percentage > 0 AND leasing_type_id IS NOT NULL THEN
      var_leasing_amount := var_gross_earnings * comp_record.default_leasing_percentage / 100;
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, status
      ) VALUES (
        target_period_calculation_id, calc_record.driver_user_id, leasing_type_id,
        var_leasing_amount, 'Leasing (' || comp_record.default_leasing_percentage || '%)', 'applied'
      );
      generated_count := generated_count + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'period_calculation_id', target_period_calculation_id,
    'gross_earnings', var_gross_earnings,
    'generated_deductions', generated_count,
    'factoring_amount', var_factoring_amount,
    'dispatching_amount', var_dispatching_amount,
    'leasing_amount', var_leasing_amount
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error regenerating deductions: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;