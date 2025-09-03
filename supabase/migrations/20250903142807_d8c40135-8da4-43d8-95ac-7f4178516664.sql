-- Solo actualizar la función SIN ejecutar el recálculo para evitar recursión infinita
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_v2(target_driver_user_id uuid, target_period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  aggregated_totals RECORD;
  driver_calc_id UUID;
  company_period_id UUID;
  total_dispatching_fees NUMERIC := 0;
  total_factoring_fees NUMERIC := 0;
  total_leasing_fees NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_other_deductions NUMERIC := 0;
  var_total_deductions NUMERIC := 0;
  dispatching_expense_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  factoring_expense_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  leasing_expense_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
BEGIN
  RAISE NOTICE '🔄 v4.1-NO-RECURSION: Iniciando recálculo para conductor % en período %', target_driver_user_id, target_period_id;

  -- Determinar IDs
  SELECT cpp.id INTO company_period_id FROM company_payment_periods cpp WHERE cpp.id = target_period_id;

  IF company_period_id IS NOT NULL THEN
    SELECT dpc.id INTO driver_calc_id FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = target_driver_user_id AND dpc.company_payment_period_id = target_period_id;
  ELSE
    SELECT dpc.id, dpc.company_payment_period_id INTO driver_calc_id, company_period_id
    FROM driver_period_calculations dpc WHERE dpc.id = target_period_id AND dpc.driver_user_id = target_driver_user_id;
  END IF;

  IF company_period_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró company_payment_period válido para period_id %', target_period_id;
  END IF;

  -- Buscar cargas que apunten al company_payment_period Y sean del conductor
  SELECT 
    COALESCE(SUM(l.total_amount), 0) as gross_earnings,
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0) as dispatching_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0) as factoring_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0) as leasing_fees,
    COUNT(l.id) as load_count
  INTO aggregated_totals
  FROM loads l
  WHERE l.payment_period_id = company_period_id AND l.driver_user_id = target_driver_user_id AND l.status != 'cancelled';

  RAISE NOTICE '📊 Cargas encontradas: % cargas, Bruto: $%', aggregated_totals.load_count, aggregated_totals.gross_earnings;

  -- Crear driver_period_calculation si no existe
  IF driver_calc_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id, company_payment_period_id, gross_earnings, other_income, fuel_expenses,
      total_deductions, total_income, net_payment, has_negative_balance, payment_status, calculated_at
    ) VALUES (
      target_driver_user_id, company_period_id, aggregated_totals.gross_earnings, 0, 0, 0,
      aggregated_totals.gross_earnings, aggregated_totals.gross_earnings, FALSE, 'calculated', now()
    ) RETURNING id INTO driver_calc_id;
    RAISE NOTICE '➕ Creado driver_period_calculation ID: %', driver_calc_id;
  END IF;

  -- Limpiar y crear expense_instances de porcentajes
  DELETE FROM expense_instances 
  WHERE payment_period_id = driver_calc_id AND user_id = target_driver_user_id
    AND expense_type_id IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id);

  -- Insertar deducciones de porcentajes
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

  -- Calcular totales finales
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe WHERE fe.driver_user_id = target_driver_user_id AND fe.payment_period_id = driver_calc_id;

  SELECT COALESCE(SUM(ei.amount), 0) INTO total_other_deductions
  FROM expense_instances ei JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE ei.user_id = target_driver_user_id AND ei.payment_period_id = driver_calc_id
    AND ei.status = 'applied' AND et.category != 'percentage_deduction';

  var_total_deductions := aggregated_totals.dispatching_fees + aggregated_totals.factoring_fees + 
                         aggregated_totals.leasing_fees + total_other_deductions;

  -- Actualizar driver_period_calculations
  UPDATE driver_period_calculations SET
    gross_earnings = aggregated_totals.gross_earnings,
    fuel_expenses = total_fuel_expenses,
    total_deductions = var_total_deductions,
    total_income = aggregated_totals.gross_earnings,
    net_payment = aggregated_totals.gross_earnings - total_fuel_expenses - var_total_deductions,
    has_negative_balance = (aggregated_totals.gross_earnings - total_fuel_expenses - var_total_deductions) < 0,
    calculated_at = now(), updated_at = now()
  WHERE id = driver_calc_id;

  RAISE NOTICE '✅ Recálculo completado: Bruto $%, Deducciones $%, Neto $%', 
    aggregated_totals.gross_earnings, var_total_deductions, 
    (aggregated_totals.gross_earnings - total_fuel_expenses - var_total_deductions);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en recálculo: %', SQLERRM;
END;
$function$;

-- Ahora hacer un UPDATE directo para recalcular este conductor específico
UPDATE driver_period_calculations 
SET gross_earnings = (
  SELECT COALESCE(SUM(l.total_amount), 0)
  FROM loads l
  WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
    AND l.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND l.status != 'cancelled'
),
net_payment = (
  SELECT COALESCE(SUM(l.total_amount), 0)
  FROM loads l
  WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
    AND l.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND l.status != 'cancelled'
),
total_income = (
  SELECT COALESCE(SUM(l.total_amount), 0)
  FROM loads l
  WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
    AND l.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND l.status != 'cancelled'
),
calculated_at = now(),
updated_at = now()
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';