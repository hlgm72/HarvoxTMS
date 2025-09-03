-- SOLUCIÓN DEFINITIVA: Arreglar arquitectura de datos y función de recálculo

-- PASO 1: Corregir la vinculación de cargas (deben apuntar a driver_period_calculation, no company_payment_period)
UPDATE loads 
SET payment_period_id = (
  SELECT dpc.id 
  FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id = loads.payment_period_id 
    AND dpc.driver_user_id = loads.driver_user_id
  LIMIT 1
)
WHERE payment_period_id IN (
  SELECT cpp.id FROM company_payment_periods cpp
) 
AND EXISTS (
  SELECT 1 FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id = loads.payment_period_id 
    AND dpc.driver_user_id = loads.driver_user_id
);

-- PASO 2: Función de recálculo DEFINITIVA que maneja la arquitectura correcta
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_v2(target_driver_user_id uuid, target_period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  aggregated_totals RECORD;
  driver_calc_id UUID;
  company_period_id UUID;
  var_total_deductions NUMERIC := 0;
  dispatching_expense_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  factoring_expense_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  leasing_expense_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
BEGIN
  RAISE NOTICE '🔄 RECALC-FINAL v5.0: Conductor % período %', target_driver_user_id, target_period_id;

  -- Determinar si el ID es company_payment_period o driver_period_calculation
  SELECT cpp.id INTO company_period_id FROM company_payment_periods cpp WHERE cpp.id = target_period_id;

  IF company_period_id IS NOT NULL THEN
    -- Es un company_payment_period, buscar el driver_period_calculation
    SELECT dpc.id INTO driver_calc_id FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = target_driver_user_id AND dpc.company_payment_period_id = target_period_id;
    RAISE NOTICE '📋 Company period: %, driver calc: %', target_period_id, driver_calc_id;
  ELSE
    -- Es un driver_period_calculation
    SELECT dpc.id, dpc.company_payment_period_id INTO driver_calc_id, company_period_id
    FROM driver_period_calculations dpc WHERE dpc.id = target_period_id AND dpc.driver_user_id = target_driver_user_id;
    RAISE NOTICE '📋 Driver calc: %, company period: %', target_period_id, company_period_id;
  END IF;

  IF company_period_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró período válido para %', target_period_id;
  END IF;

  -- Crear driver_period_calculation si no existe
  IF driver_calc_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id, company_payment_period_id, gross_earnings, other_income, fuel_expenses,
      total_deductions, total_income, net_payment, has_negative_balance, payment_status, calculated_at
    ) VALUES (
      target_driver_user_id, company_period_id, 0, 0, 0, 0, 0, 0, FALSE, 'calculated', now()
    ) RETURNING id INTO driver_calc_id;
    RAISE NOTICE '➕ Creado driver_period_calculation: %', driver_calc_id;
  END IF;

  -- SUMAR CARGAS que apuntan al driver_period_calculation
  SELECT 
    COALESCE(SUM(l.total_amount), 0) as gross_earnings,
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0) as dispatching_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0) as factoring_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0) as leasing_fees,
    COUNT(l.id) as load_count
  INTO aggregated_totals
  FROM loads l
  WHERE l.payment_period_id = driver_calc_id AND l.driver_user_id = target_driver_user_id AND l.status != 'cancelled';

  RAISE NOTICE '📊 Cargas: % total, Bruto: $%, Disp: $%, Fact: $%, Lease: $%', 
    aggregated_totals.load_count, aggregated_totals.gross_earnings, 
    aggregated_totals.dispatching_fees, aggregated_totals.factoring_fees, aggregated_totals.leasing_fees;

  -- Limpiar deducciones de porcentajes existentes
  DELETE FROM expense_instances 
  WHERE payment_period_id = driver_calc_id AND user_id = target_driver_user_id
    AND expense_type_id IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id);

  -- Crear deducciones de porcentajes
  IF aggregated_totals.dispatching_fees > 0 THEN
    INSERT INTO expense_instances (payment_period_id, user_id, expense_type_id, amount, description, status, applied_at)
    VALUES (driver_calc_id, target_driver_user_id, dispatching_expense_type_id, aggregated_totals.dispatching_fees,
            'Dispatching fees from loads', 'applied', now());
  END IF;

  IF aggregated_totals.factoring_fees > 0 THEN
    INSERT INTO expense_instances (payment_period_id, user_id, expense_type_id, amount, description, status, applied_at)
    VALUES (driver_calc_id, target_driver_user_id, factoring_expense_type_id, aggregated_totals.factoring_fees,
            'Factoring fees from loads', 'applied', now());
  END IF;

  IF aggregated_totals.leasing_fees > 0 THEN
    INSERT INTO expense_instances (payment_period_id, user_id, expense_type_id, amount, description, status, applied_at)
    VALUES (driver_calc_id, target_driver_user_id, leasing_expense_type_id, aggregated_totals.leasing_fees,
            'Leasing fees from loads', 'applied', now());
  END IF;

  -- Calcular totales de fuel y otras deducciones
  SELECT 
    COALESCE(SUM(fe.total_amount), 0) as fuel_total,
    COALESCE(SUM(CASE WHEN et.category != 'percentage_deduction' THEN ei.amount ELSE 0 END), 0) as other_deductions,
    COALESCE(SUM(ei.amount), 0) as all_deductions
  INTO var_total_deductions, var_total_deductions, var_total_deductions
  FROM expense_instances ei 
  JOIN expense_types et ON ei.expense_type_id = et.id
  FULL OUTER JOIN fuel_expenses fe ON fe.payment_period_id = driver_calc_id AND fe.driver_user_id = target_driver_user_id
  WHERE (ei.user_id = target_driver_user_id AND ei.payment_period_id = driver_calc_id AND ei.status = 'applied')
     OR (fe.payment_period_id = driver_calc_id AND fe.driver_user_id = target_driver_user_id);

  -- Si no hay datos, calcular por separado
  IF var_total_deductions IS NULL THEN
    SELECT COALESCE(SUM(ei.amount), 0) INTO var_total_deductions
    FROM expense_instances ei WHERE ei.user_id = target_driver_user_id AND ei.payment_period_id = driver_calc_id AND ei.status = 'applied';
  END IF;

  DECLARE
    fuel_total NUMERIC := 0;
  BEGIN
    SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_total
    FROM fuel_expenses fe WHERE fe.driver_user_id = target_driver_user_id AND fe.payment_period_id = driver_calc_id;
  END;

  -- Actualizar driver_period_calculations con todos los totales
  UPDATE driver_period_calculations SET
    gross_earnings = aggregated_totals.gross_earnings,
    other_income = 0,
    fuel_expenses = fuel_total,
    total_deductions = var_total_deductions,
    total_income = aggregated_totals.gross_earnings,
    net_payment = aggregated_totals.gross_earnings - fuel_total - var_total_deductions,
    has_negative_balance = (aggregated_totals.gross_earnings - fuel_total - var_total_deductions) < 0,
    calculated_at = now(),
    updated_at = now()
  WHERE id = driver_calc_id;

  RAISE NOTICE '✅ FINAL: Bruto $%, Combustible $%, Deducciones $%, Neto $%', 
    aggregated_totals.gross_earnings, fuel_total, var_total_deductions,
    (aggregated_totals.gross_earnings - fuel_total - var_total_deductions);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en recálculo final: %', SQLERRM;
END;
$function$;

-- PASO 3: Ejecutar el recálculo para corregir los datos
SELECT auto_recalculate_driver_payment_period_v2('484d83b3-b928-46b3-9705-db225ddb9b0c', '49cb0343-7af4-4df0-b31e-75380709c58e');