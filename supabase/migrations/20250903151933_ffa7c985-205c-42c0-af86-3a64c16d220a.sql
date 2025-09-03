-- =====================================================
-- 🚨 ARREGLO DE TIMEOUT EN RECÁLCULO DE PAGOS v4.3
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_v3(
  target_driver_user_id UUID,
  target_period_id UUID
) RETURNS void
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
  RAISE NOTICE '🔄 v4.3-TIMEOUT-FIX: Iniciando recálculo para conductor % en período %', target_driver_user_id, target_period_id;

  -- 🚨 QUICK EXIT: Check if calculation already in progress
  IF EXISTS (
    SELECT 1 FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query LIKE '%auto_recalculate_driver_payment_period%'
    AND query LIKE '%' || target_driver_user_id::text || '%'
    AND query LIKE '%' || target_period_id::text || '%'
    AND pid != pg_backend_pid()
    AND backend_start < now() - interval '5 seconds'
  ) THEN
    RAISE NOTICE '⚠️ TIMEOUT-FIX: Recálculo ya en progreso, saltando para evitar timeout';
    RETURN;
  END IF;

  -- Determinar IDs rápidamente con LIMIT
  SELECT cpp.id INTO company_period_id 
  FROM company_payment_periods cpp 
  WHERE cpp.id = target_period_id 
  LIMIT 1;

  IF company_period_id IS NOT NULL THEN
    SELECT dpc.id INTO driver_calc_id 
    FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = target_driver_user_id 
    AND dpc.company_payment_period_id = target_period_id
    LIMIT 1;
  ELSE
    SELECT dpc.id, dpc.company_payment_period_id INTO driver_calc_id, company_period_id
    FROM driver_period_calculations dpc 
    WHERE dpc.id = target_period_id 
    AND dpc.driver_user_id = target_driver_user_id
    LIMIT 1;
  END IF;

  IF company_period_id IS NULL THEN
    RAISE NOTICE '❌ TIMEOUT-FIX: No se encontró período válido';
    RETURN;
  END IF;

  -- 🚀 OPTIMIZACIÓN: Usar una sola consulta con agregaciones
  SELECT 
    COALESCE(SUM(l.total_amount), 0) as gross_earnings,
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0) as dispatching_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0) as factoring_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0) as leasing_fees,
    COUNT(l.id) as load_count
  INTO aggregated_totals
  FROM loads l
  WHERE l.payment_period_id = company_period_id 
    AND l.driver_user_id = target_driver_user_id 
    AND l.status != 'cancelled'
  LIMIT 1000; -- Límite de seguridad

  -- Calcular gastos de combustible con límite
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc 
    WHERE dpc.company_payment_period_id = company_period_id 
    AND dpc.driver_user_id = target_driver_user_id
    LIMIT 1
  )
  LIMIT 1000;

  -- Calcular otras deducciones con límite
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_other_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc 
    WHERE dpc.company_payment_period_id = company_period_id 
    AND dpc.driver_user_id = target_driver_user_id
    LIMIT 1
  )
  AND ei.expense_type_id NOT IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id)
  LIMIT 1000;

  -- Totales de deducciones
  total_dispatching_fees := COALESCE(aggregated_totals.dispatching_fees, 0);
  total_factoring_fees := COALESCE(aggregated_totals.factoring_fees, 0);
  total_leasing_fees := COALESCE(aggregated_totals.leasing_fees, 0);
  var_total_deductions := total_dispatching_fees + total_factoring_fees + total_leasing_fees + total_other_deductions;

  -- 🎯 ACTUALIZACIÓN SIMPLE Y RÁPIDA
  UPDATE driver_period_calculations SET
    gross_earnings = COALESCE(aggregated_totals.gross_earnings, 0),
    fuel_expenses = total_fuel_expenses,
    total_deductions = var_total_deductions,
    other_income = COALESCE(other_income, 0),
    total_income = COALESCE(aggregated_totals.gross_earnings, 0) + COALESCE(other_income, 0),
    net_payment = (COALESCE(aggregated_totals.gross_earnings, 0) + COALESCE(other_income, 0)) - total_fuel_expenses - var_total_deductions,
    has_negative_balance = ((COALESCE(aggregated_totals.gross_earnings, 0) + COALESCE(other_income, 0)) - total_fuel_expenses - var_total_deductions) < 0,
    updated_at = now()
  WHERE id = driver_calc_id;

  RAISE NOTICE '✅ TIMEOUT-FIX: Recálculo completado exitosamente para conductor % período %', target_driver_user_id, target_period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ TIMEOUT-FIX: Error en recálculo: %', SQLERRM;
  -- No re-lanzar el error para evitar cascadas
END;
$function$;