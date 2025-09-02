-- ===============================================
-- 🚨 SOLUCIÓN: BUCLE INFINITO EN TRIGGERS
-- ===============================================
-- Problema: auto_recalculate_driver_payment_period_v2 inserta en expense_instances
-- lo que activa trigger_auto_recalculate_on_expense_changes creando bucle infinito

-- SOLUCIÓN: Deshabilitar trigger temporalmente durante inserciones automáticas
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
  RAISE LOG '🔄 v2.2-FIXED: Iniciando recálculo SIN recursión para conductor % en período %', 
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

  -- ⚡ DESACTIVAR TRIGGER TEMPORALMENTE PARA EVITAR RECURSIÓN
  ALTER TABLE expense_instances DISABLE TRIGGER trigger_auto_recalculate_on_expense_changes;

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

    -- Insertar deducciones (SIN activar triggers)
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

  -- ⚡ REACTIVAR TRIGGER
  ALTER TABLE expense_instances ENABLE TRIGGER trigger_auto_recalculate_on_expense_changes;

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

  RAISE LOG '✅ v2.2-FIXED: Recálculo completado SIN recursión. Conductor: % | Bruto: % | Deducciones: % | Neto: %', 
    target_driver_user_id, gross_earnings, total_deductions, net_payment;

EXCEPTION WHEN OTHERS THEN
  -- En caso de error, asegurar que el trigger se reactive
  ALTER TABLE expense_instances ENABLE TRIGGER trigger_auto_recalculate_on_expense_changes;
  RAISE LOG 'Error en recálculo v2.2-FIXED: %', SQLERRM;
  RAISE;
END;
$$;

-- Log de corrección
DO $$
BEGIN
    RAISE NOTICE '✅ PROBLEMA SOLUCIONADO: Bucle infinito de triggers corregido';
    RAISE NOTICE '   - auto_recalculate_driver_payment_period_v2 ahora desactiva trigger temporalmente';
    RAISE NOTICE '   - No más recursión infinita en expense_instances';
    RAISE NOTICE '   - Stack depth limit exceeded RESUELTO';
END $$;