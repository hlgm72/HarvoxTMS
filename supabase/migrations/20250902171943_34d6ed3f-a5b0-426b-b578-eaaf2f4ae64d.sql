-- Fix the auto_recalculate function to properly update gross_earnings
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_v2(target_driver_user_id uuid, target_company_payment_period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  company_settings RECORD;
  total_dispatching NUMERIC := 0;
  total_factoring NUMERIC := 0;
  total_leasing NUMERIC := 0;
  total_gross_earnings NUMERIC := 0;
  load_count INTEGER := 0;
  dispatching_expense_type_id UUID;
  factoring_expense_type_id UUID;
  leasing_expense_type_id UUID;
BEGIN
  RAISE LOG '🚀 SISTEMA ROBUSTO v2: Iniciando recálculo COMPLETO para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Obtener el registro de cálculo del conductor
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id;
  
  IF calculation_record IS NULL THEN
    RAISE LOG '❌ No se encontró registro de cálculo para conductor % en período %',
      target_driver_user_id, target_company_payment_period_id;
    RETURN;
  END IF;

  -- Obtener la configuración de porcentajes de la empresa
  SELECT 
    c.default_dispatching_percentage,
    c.default_factoring_percentage, 
    c.default_leasing_percentage
  INTO company_settings
  FROM company_payment_periods cpp
  JOIN companies c ON cpp.company_id = c.id
  WHERE cpp.id = target_company_payment_period_id;

  -- Obtener los IDs de los tipos de deducciones por porcentajes
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;

  -- ===============================================
  -- PASO 1: CALCULAR TOTALES DE TODAS LAS CARGAS
  -- ===============================================
  
  SELECT 
    COALESCE(SUM(l.total_amount), 0),
    COUNT(*)
  INTO total_gross_earnings, load_count
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
    AND l.payment_period_id = target_company_payment_period_id
    AND l.status NOT IN ('cancelled', 'rejected')
    AND l.total_amount > 0;

  RAISE LOG '✅ CARGAS CALCULADAS: % cargas por $%. Actualizando gross_earnings...', 
    load_count, total_gross_earnings;

  -- ===============================================
  -- PASO 2: ACTUALIZAR GROSS EARNINGS PRIMERO
  -- ===============================================
  
  UPDATE driver_period_calculations 
  SET 
    gross_earnings = total_gross_earnings,
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  RAISE LOG '✅ GROSS EARNINGS ACTUALIZADO a $%', total_gross_earnings;

  -- Calcular deducciones totales basadas en el gross total
  IF total_gross_earnings > 0 THEN
    total_dispatching := ROUND(total_gross_earnings * (COALESCE(company_settings.default_dispatching_percentage, 5) / 100.0), 2);
    total_factoring := ROUND(total_gross_earnings * (COALESCE(company_settings.default_factoring_percentage, 3) / 100.0), 2);  
    total_leasing := ROUND(total_gross_earnings * (COALESCE(company_settings.default_leasing_percentage, 5) / 100.0), 2);
  END IF;

  RAISE LOG '✅ Deducciones calculadas: Disp=$%, Fact=$%, Leas=$%',
    total_dispatching, total_factoring, total_leasing;

  -- ===============================================
  -- PASO 3: LIMPIAR Y RECREAR DEDUCCIONES AUTOMÁTICAS
  -- ===============================================
  
  -- Eliminar deducciones automáticas existentes
  DELETE FROM expense_instances 
  WHERE payment_period_id = calculation_record.id
    AND user_id = target_driver_user_id
    AND expense_type_id IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id);

  -- Crear deducción por dispatching (una sola por período)
  IF total_dispatching > 0 AND dispatching_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id, user_id, expense_type_id, amount, description, 
      status, applied_at, applied_by, expense_date
    ) VALUES (
      calculation_record.id, target_driver_user_id, dispatching_expense_type_id,
      total_dispatching,
      'Dispatching ' || COALESCE(company_settings.default_dispatching_percentage, 5) || '% sobre $' || total_gross_earnings || ' (' || load_count || ' cargas)',
      'applied', now(), target_driver_user_id, CURRENT_DATE
    );
  END IF;

  -- Crear deducción por factoring (una sola por período)
  IF total_factoring > 0 AND factoring_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id, user_id, expense_type_id, amount, description,
      status, applied_at, applied_by, expense_date
    ) VALUES (
      calculation_record.id, target_driver_user_id, factoring_expense_type_id,
      total_factoring,
      'Factoring ' || COALESCE(company_settings.default_factoring_percentage, 3) || '% sobre $' || total_gross_earnings || ' (' || load_count || ' cargas)',
      'applied', now(), target_driver_user_id, CURRENT_DATE
    );
  END IF;

  -- Crear deducción por leasing (una sola por período)
  IF total_leasing > 0 AND leasing_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id, user_id, expense_type_id, amount, description,
      status, applied_at, applied_by, expense_date
    ) VALUES (
      calculation_record.id, target_driver_user_id, leasing_expense_type_id,
      total_leasing,
      'Leasing ' || COALESCE(company_settings.default_leasing_percentage, 5) || '% sobre $' || total_gross_earnings || ' (' || load_count || ' cargas)',
      'applied', now(), target_driver_user_id, CURRENT_DATE
    );
  END IF;

  -- ===============================================
  -- PASO 4: RECALCULAR TODOS LOS DEMÁS TOTALES
  -- ===============================================
  
  UPDATE driver_period_calculations 
  SET 
    -- Ya tenemos gross_earnings actualizado arriba
    -- Otros ingresos adicionales
    other_income = (
      SELECT COALESCE(SUM(oi.amount), 0)
      FROM other_income oi
      WHERE oi.user_id = target_driver_user_id
        AND oi.payment_period_id = calculation_record.id
    ),
    -- Gastos de combustible
    fuel_expenses = (
      SELECT COALESCE(SUM(fe.total_amount), 0)
      FROM fuel_expenses fe
      WHERE fe.driver_user_id = target_driver_user_id
        AND fe.payment_period_id = calculation_record.id
    ),
    -- TODAS las deducciones (automáticas + manuales)
    total_deductions = (
      SELECT COALESCE(SUM(ei.amount), 0)
      FROM expense_instances ei
      WHERE ei.user_id = target_driver_user_id
        AND ei.payment_period_id = calculation_record.id
        AND ei.status = 'applied'
    ),
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  -- Calcular los totales finales
  UPDATE driver_period_calculations 
  SET 
    total_income = gross_earnings + other_income,
    net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions,
    has_negative_balance = ((gross_earnings + other_income) - fuel_expenses - total_deductions) < 0,
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  RAISE LOG '✅ RECÁLCULO ROBUSTO COMPLETADO: Conductor=%, Gross=$%, Net=$%',
    target_driver_user_id, total_gross_earnings, 
    (SELECT net_payment FROM driver_period_calculations WHERE driver_user_id = target_driver_user_id AND company_payment_period_id = target_company_payment_period_id);

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ ERROR en recálculo robusto: % - Conductor: %, Período: %', 
    SQLERRM, target_driver_user_id, target_company_payment_period_id;
  RAISE;
END;
$function$