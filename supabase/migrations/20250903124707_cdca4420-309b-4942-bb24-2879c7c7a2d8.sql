-- ============================================================================
-- CORRECCIÓN DEFINITIVA v3.3 - ELIMINAR AMBIGUEDAD total_deductions COMPLETAMENTE
-- ============================================================================

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
  var_total_deductions NUMERIC := 0; -- CAMBIO CRÍTICO: renombrar variable para evitar ambigüedad
  dispatching_expense_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  factoring_expense_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  leasing_expense_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
BEGIN
  -- Log de inicio
  RAISE NOTICE '🔄 v3.3-AMBIGUEDAD-ELIMINADA: Iniciando recálculo para conductor % en período %', target_driver_user_id, target_period_id;

  -- ============================================================================
  -- PASO 1: DETERMINAR SI ES COMPANY_PAYMENT_PERIOD O DRIVER_PERIOD_CALCULATION
  -- ============================================================================
  
  -- Verificar si el target_period_id es un company_payment_period
  SELECT cpp.id INTO company_period_id
  FROM company_payment_periods cpp
  WHERE cpp.id = target_period_id;

  IF company_period_id IS NOT NULL THEN
    -- Es un company_payment_period, buscar el driver_period_calculation asociado
    SELECT dpc.id INTO driver_calc_id
    FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = target_driver_user_id 
    AND dpc.company_payment_period_id = target_period_id;
    
    RAISE NOTICE '📋 Usando company_payment_period: %, driver_calc: %', target_period_id, driver_calc_id;
  ELSE
    -- Es un driver_period_calculation, obtener el company_payment_period
    SELECT dpc.id, dpc.company_payment_period_id INTO driver_calc_id, company_period_id
    FROM driver_period_calculations dpc
    WHERE dpc.id = target_period_id
    AND dpc.driver_user_id = target_driver_user_id;
    
    RAISE NOTICE '📋 Usando driver_period_calculation: %, company_period: %', target_period_id, company_period_id;
  END IF;

  -- Validar que tenemos los IDs necesarios
  IF company_period_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_OPERATION_FAILED: No se encontró company_payment_period válido para period_id %', target_period_id;
  END IF;

  -- ============================================================================
  -- PASO 2: CALCULAR PORCENTAJES CARGA POR CARGA (usando company_payment_period)
  -- ============================================================================
  
  -- Calcular los totales de porcentajes sumando carga por carga
  SELECT 
    COALESCE(SUM(l.total_amount), 0) as gross_earnings,
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0) as dispatching_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0) as factoring_fees,
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0) as leasing_fees,
    COUNT(l.id) as load_count
  INTO aggregated_totals
  FROM loads l
  JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
  WHERE dpc.company_payment_period_id = company_period_id
    AND dpc.driver_user_id = target_driver_user_id
    AND l.driver_user_id = target_driver_user_id
    AND l.status != 'cancelled';

  -- Asignar los resultados a variables
  total_dispatching_fees := aggregated_totals.dispatching_fees;
  total_factoring_fees := aggregated_totals.factoring_fees;
  total_leasing_fees := aggregated_totals.leasing_fees;

  RAISE NOTICE '📊 Porcentajes calculados: Dispatching=%, Factoring=%, Leasing=% (% cargas)', 
    total_dispatching_fees, total_factoring_fees, total_leasing_fees, aggregated_totals.load_count;

  -- ============================================================================
  -- PASO 3: CREAR/ACTUALIZAR driver_period_calculation SI ES NECESARIO
  -- ============================================================================

  IF driver_calc_id IS NULL THEN
    -- Crear nuevo driver_period_calculation
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings,
      other_income,
      fuel_expenses,
      total_deductions,
      total_income,
      net_payment,
      has_negative_balance,
      payment_status,
      calculated_at,
      calculated_by
    ) VALUES (
      target_driver_user_id,
      company_period_id,
      aggregated_totals.gross_earnings,
      0, -- other_income
      0, -- fuel_expenses (se calculará después)
      0, -- total_deductions (se calculará después)
      aggregated_totals.gross_earnings, -- total_income inicial
      aggregated_totals.gross_earnings, -- net_payment inicial
      FALSE,
      'calculated',
      now(),
      NULL
    ) RETURNING id INTO driver_calc_id;
    
    RAISE NOTICE '➕ Creado nuevo driver_period_calculation con ID: %', driver_calc_id;
  END IF;

  -- ============================================================================
  -- PASO 4: LIMPIAR EXPENSE_INSTANCES DE PORCENTAJES EXISTENTES
  -- ============================================================================

  DELETE FROM expense_instances 
  WHERE payment_period_id = driver_calc_id
    AND user_id = target_driver_user_id
    AND expense_type_id IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id);

  RAISE NOTICE '🗑️ Eliminadas expense_instances de porcentajes existentes';

  -- ============================================================================
  -- PASO 5: CREAR NUEVAS EXPENSE_INSTANCES PARA CADA PORCENTAJE
  -- ============================================================================

  -- Crear expense_instance para Dispatching Fee (solo si > 0)
  IF total_dispatching_fees > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id,
      user_id,
      expense_type_id,
      amount,
      description,
      status,
      applied_at,
      applied_by,
      created_by
    ) VALUES (
      driver_calc_id,
      target_driver_user_id,
      dispatching_expense_type_id,
      total_dispatching_fees,
      'Dispatching fees calculated from loads',
      'applied',
      now(),
      NULL,
      NULL
    );
    RAISE NOTICE '💰 Creada deducción Dispatching: $%', total_dispatching_fees;
  END IF;

  -- Crear expense_instance para Factoring Fee (solo si > 0)
  IF total_factoring_fees > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id,
      user_id,
      expense_type_id,
      amount,
      description,
      status,
      applied_at,
      applied_by,
      created_by
    ) VALUES (
      driver_calc_id,
      target_driver_user_id,
      factoring_expense_type_id,
      total_factoring_fees,
      'Factoring fees calculated from loads',
      'applied',
      now(),
      NULL,
      NULL
    );
    RAISE NOTICE '💰 Creada deducción Factoring: $%', total_factoring_fees;
  END IF;

  -- Crear expense_instance para Leasing Fee (solo si > 0)
  IF total_leasing_fees > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id,
      user_id,
      expense_type_id,
      amount,
      description,
      status,
      applied_at,
      applied_by,
      created_by
    ) VALUES (
      driver_calc_id,
      target_driver_user_id,
      leasing_expense_type_id,
      total_leasing_fees,
      'Leasing fees calculated from loads',
      'applied',
      now(),
      NULL,
      NULL
    );
    RAISE NOTICE '💰 Creada deducción Leasing: $%', total_leasing_fees;
  END IF;

  -- ============================================================================
  -- PASO 6: CALCULAR FUEL EXPENSES Y OTRAS DEDUCCIONES
  -- ============================================================================

  -- Calcular fuel expenses
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = target_driver_user_id
    AND fe.payment_period_id = driver_calc_id;

  -- Calcular otras deducciones (no porcentajes) - SIN AMBIGÜEDAD
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_other_deductions
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE ei.user_id = target_driver_user_id
    AND ei.payment_period_id = driver_calc_id
    AND ei.status = 'applied'
    AND et.category != 'percentage_deduction';

  -- Total de deducciones = porcentajes + otras deducciones (usando variable local)
  var_total_deductions := total_dispatching_fees + total_factoring_fees + total_leasing_fees + total_other_deductions;

  RAISE NOTICE '📋 Totales - Fuel: $%, Otras deducciones: $%, Total deducciones: $%', 
    total_fuel_expenses, total_other_deductions, var_total_deductions;

  -- ============================================================================
  -- PASO 7: ACTUALIZAR DRIVER_PERIOD_CALCULATIONS CON TOTALES CORRECTOS
  -- ============================================================================

  UPDATE driver_period_calculations 
  SET
    gross_earnings = aggregated_totals.gross_earnings,
    other_income = 0,
    fuel_expenses = total_fuel_expenses,
    total_deductions = var_total_deductions,  -- usar variable local, NO columna
    total_income = aggregated_totals.gross_earnings + 0, -- gross_earnings + other_income
    net_payment = aggregated_totals.gross_earnings + 0 - total_fuel_expenses - var_total_deductions,
    has_negative_balance = (aggregated_totals.gross_earnings + 0 - total_fuel_expenses - var_total_deductions) < 0,
    calculated_at = now(),
    updated_at = now()
  WHERE id = driver_calc_id;

  RAISE NOTICE '✅ v3.3-AMBIGUEDAD-ELIMINADA: Recálculo completado correctamente para conductor %', target_driver_user_id;
  RAISE NOTICE '💵 Resultado final - Bruto: $%, Deducciones: $%, Neto: $%', 
    aggregated_totals.gross_earnings, 
    var_total_deductions, 
    (aggregated_totals.gross_earnings - total_fuel_expenses - var_total_deductions);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Error en recálculo v3.3-AMBIGUEDAD-ELIMINADA: %', SQLERRM;
END;
$function$;