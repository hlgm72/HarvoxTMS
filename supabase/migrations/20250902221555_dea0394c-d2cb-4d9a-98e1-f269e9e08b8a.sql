-- ===============================================
-- 🚨 SOLUCIÓN DEFINITIVA: EVITAR RECURSIÓN SIN ALTER TABLE
-- ===============================================
-- Problema: No se puede usar ALTER TABLE durante consultas activas
-- Solución: Usar variable de sesión para detectar contexto de recálculo

-- 1. FUNCIÓN DE RECÁLCULO MEJORADA (sin ALTER TABLE)
CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period_v2(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  load_record RECORD;
  calculation_record RECORD;
  company_settings RECORD;
  dispatching_amount NUMERIC := 0;
  factoring_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
  total_load_deductions NUMERIC := 0;
  dispatching_expense_type_id UUID;
  factoring_expense_type_id UUID;
  leasing_expense_type_id UUID;
  gross_earnings NUMERIC := 0;
  fuel_expenses_sum NUMERIC := 0;
  other_deductions_sum NUMERIC := 0;
  other_income_sum NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
BEGIN
  RAISE LOG '🔄 v2.3-SAFE: Iniciando recálculo SEGURO para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- ⚡ ESTABLECER BANDERA PARA EVITAR RECURSIÓN
  PERFORM set_config('app.in_auto_recalculation', 'true', true);

  -- Obtener el registro de cálculo del conductor
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id;
  
  IF calculation_record IS NULL THEN
    RAISE LOG '❌ No se encontró registro de cálculo para conductor % en período %',
      target_driver_user_id, target_company_payment_period_id;
    -- Limpiar bandera antes de salir
    PERFORM set_config('app.in_auto_recalculation', '', true);
    RETURN;
  END IF;

  -- Obtener configuración de la empresa
  SELECT 
    c.default_dispatching_percentage,
    c.default_factoring_percentage, 
    c.default_leasing_percentage
  INTO company_settings
  FROM company_payment_periods cpp
  JOIN companies c ON cpp.company_id = c.id
  WHERE cpp.id = target_company_payment_period_id;

  -- Obtener los IDs de los tipos de deducciones
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;

  -- Limpiar deducciones automáticas existentes
  DELETE FROM expense_instances 
  WHERE payment_period_id = calculation_record.id
    AND user_id = target_driver_user_id
    AND expense_type_id IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id);

  -- Generar deducciones por cada carga
  FOR load_record IN 
    SELECT l.*
    FROM loads l
    WHERE l.driver_user_id = target_driver_user_id
      AND l.payment_period_id = target_company_payment_period_id
      AND l.status NOT IN ('cancelled', 'rejected')
      AND l.total_amount > 0
  LOOP
    -- Calcular deducciones por porcentajes
    dispatching_amount := ROUND(load_record.total_amount * (COALESCE(company_settings.default_dispatching_percentage, 5) / 100.0), 2);
    factoring_amount := ROUND(load_record.total_amount * (COALESCE(company_settings.default_factoring_percentage, 3) / 100.0), 2);  
    leasing_amount := ROUND(load_record.total_amount * (COALESCE(company_settings.default_leasing_percentage, 5) / 100.0), 2);

    -- Insertar deducciones (los triggers detectarán la bandera y no recalcularán)
    IF dispatching_amount > 0 AND dispatching_expense_type_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, 
        status, applied_at, applied_by, expense_date
      ) VALUES (
        calculation_record.id, target_driver_user_id, dispatching_expense_type_id,
        dispatching_amount,
        'Dispatching ' || COALESCE(company_settings.default_dispatching_percentage, 5) || '% - Carga #' || load_record.load_number,
        'applied', now(), target_driver_user_id, CURRENT_DATE
      );
    END IF;

    IF factoring_amount > 0 AND factoring_expense_type_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description,
        status, applied_at, applied_by, expense_date
      ) VALUES (
        calculation_record.id, target_driver_user_id, factoring_expense_type_id,
        factoring_amount,
        'Factoring ' || COALESCE(company_settings.default_factoring_percentage, 3) || '% - Carga #' || load_record.load_number,
        'applied', now(), target_driver_user_id, CURRENT_DATE
      );
    END IF;

    IF leasing_amount > 0 AND leasing_expense_type_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description,
        status, applied_at, applied_by, expense_date
      ) VALUES (
        calculation_record.id, target_driver_user_id, leasing_expense_type_id,
        leasing_amount,
        'Leasing ' || COALESCE(company_settings.default_leasing_percentage, 5) || '% - Carga #' || load_record.load_number,
        'applied', now(), target_driver_user_id, CURRENT_DATE
      );
    END IF;

    total_load_deductions := total_load_deductions + dispatching_amount + factoring_amount + leasing_amount;
    gross_earnings := gross_earnings + load_record.total_amount;
  END LOOP;

  -- Calcular totales finales
  SELECT COALESCE(SUM(total_amount), 0) INTO fuel_expenses_sum
  FROM fuel_expenses 
  WHERE payment_period_id = calculation_record.id;

  SELECT COALESCE(SUM(amount), 0) INTO other_deductions_sum
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE ei.payment_period_id = calculation_record.id
    AND ei.user_id = target_driver_user_id
    AND et.category = 'fixed_deduction';

  SELECT COALESCE(SUM(amount), 0) INTO other_income_sum
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE ei.payment_period_id = calculation_record.id
    AND ei.user_id = target_driver_user_id
    AND et.category = 'income';

  total_deductions := total_load_deductions + fuel_expenses_sum + other_deductions_sum;
  total_income := gross_earnings + other_income_sum;
  net_payment := total_income - total_deductions;

  -- Actualizar los totales en driver_period_calculations
  UPDATE driver_period_calculations SET
    gross_earnings = gross_earnings,
    fuel_expenses = fuel_expenses_sum,
    total_deductions = total_deductions,
    other_income = other_income_sum,
    total_income = total_income,
    net_payment = net_payment,
    has_negative_balance = (net_payment < 0),
    calculated_at = now(),
    updated_at = now()
  WHERE id = calculation_record.id;

  -- ⚡ LIMPIAR BANDERA AL FINALIZAR
  PERFORM set_config('app.in_auto_recalculation', '', true);

  RAISE LOG '✅ v2.3-SAFE: Recálculo completado SEGURO. Conductor: % | Bruto: % | Deducciones: % | Neto: %', 
    target_driver_user_id, gross_earnings, total_deductions, net_payment;

EXCEPTION WHEN OTHERS THEN
  -- En caso de error, limpiar bandera
  PERFORM set_config('app.in_auto_recalculation', '', true);
  RAISE LOG 'Error en recálculo v2.3-SAFE: %', SQLERRM;
  RAISE;
END;
$$;

-- 2. MODIFICAR TRIGGERS PARA DETECTAR CONTEXTO DE RECÁLCULO
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_expense_instances()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_driver_user_id UUID;
  affected_company_period_id UUID;
  is_in_recalculation TEXT;
BEGIN
  -- ⚡ VERIFICAR SI ESTAMOS EN CONTEXTO DE RECÁLCULO AUTOMÁTICO
  SELECT current_setting('app.in_auto_recalculation', true) INTO is_in_recalculation;
  
  -- Si estamos en recálculo automático, NO ejecutar otro recálculo (evita recursión)
  IF is_in_recalculation = 'true' THEN
    RAISE LOG 'auto_recalculate_on_expense_instances: Saltando recálculo (ya en contexto de auto-recálculo)';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.user_id;
    SELECT company_payment_period_id INTO affected_company_period_id
    FROM driver_period_calculations 
    WHERE id = OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.user_id;
    SELECT company_payment_period_id INTO affected_company_period_id
    FROM driver_period_calculations 
    WHERE id = NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_company_period_id IS NOT NULL THEN
    PERFORM public.auto_recalculate_driver_payment_period_v2(
      affected_driver_user_id, 
      affected_company_period_id
    );
    
    RAISE LOG 'auto_recalculate_on_expense_instances: Recálculo v2.3 ejecutado para conductor % en período %', 
      affected_driver_user_id, affected_company_period_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Log de corrección
DO $$
BEGIN
    RAISE NOTICE '✅ PROBLEMA RESUELTO: Recursión infinita evitada con variable de sesión';
    RAISE NOTICE '   - auto_recalculate_driver_payment_period_v2 v2.3 usa bandera en lugar de ALTER TABLE';
    RAISE NOTICE '   - Triggers detectan contexto de recálculo automático';
    RAISE NOTICE '   - Sin bloqueos de tabla durante operaciones activas';
END $$;