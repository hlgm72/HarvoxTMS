-- ===============================================
-- 🚨 PLAN DE ARREGLO DEL SISTEMA DE CÁLCULOS v1.0
-- ⚠️ IMPLEMENTACIÓN COMPLETA DE TRIGGERS Y VALIDACIONES
-- ===============================================

-- FASE 1: TRIGGERS DE RECÁLCULO AUTOMÁTICO
-- ==========================================

-- Función principal de recálculo automático
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS VOID AS $$
DECLARE
  recalc_result JSONB;
BEGIN
  -- Log del recálculo automático
  RAISE LOG 'auto_recalculate_driver_payment_period: Iniciando recálculo para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Ejecutar recálculo usando la función existente
  SELECT public.recalculate_driver_payment_period(target_company_payment_period_id, target_driver_user_id) 
  INTO recalc_result;

  -- Verificar que el recálculo fue exitoso
  IF recalc_result IS NULL OR (recalc_result->>'success')::BOOLEAN IS NOT TRUE THEN
    RAISE WARNING 'auto_recalculate_driver_payment_period: Falló recálculo para conductor % en período %', 
      target_driver_user_id, target_company_payment_period_id;
  ELSE
    RAISE LOG 'auto_recalculate_driver_payment_period: Recálculo exitoso para conductor % en período %', 
      target_driver_user_id, target_company_payment_period_id;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_recalculate_driver_payment_period: Error en recálculo: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para LOADS
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_loads()
RETURNS TRIGGER AS $$
DECLARE
  affected_driver_user_id UUID;
  affected_period_id UUID;
BEGIN
  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.driver_user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.driver_user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    -- Encontrar el company_payment_period_id
    SELECT cpp.id INTO affected_period_id
    FROM company_payment_periods cpp
    JOIN driver_period_calculations dpc ON cpp.id = dpc.company_payment_period_id
    WHERE dpc.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM public.auto_recalculate_driver_payment_period(affected_driver_user_id, affected_period_id);
      RAISE LOG 'auto_recalculate_on_loads: Recálculo ejecutado para conductor % en período %', 
        affected_driver_user_id, affected_period_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para FUEL_EXPENSES
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_fuel_expenses()
RETURNS TRIGGER AS $$
DECLARE
  affected_driver_user_id UUID;
  affected_period_id UUID;
BEGIN
  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.driver_user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.driver_user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    -- Encontrar el company_payment_period_id
    SELECT cpp.id INTO affected_period_id
    FROM company_payment_periods cpp
    JOIN driver_period_calculations dpc ON cpp.id = dpc.company_payment_period_id
    WHERE dpc.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM public.auto_recalculate_driver_payment_period(affected_driver_user_id, affected_period_id);
      RAISE LOG 'auto_recalculate_on_fuel_expenses: Recálculo ejecutado para conductor % en período %', 
        affected_driver_user_id, affected_period_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para OTHER_INCOME
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_other_income()
RETURNS TRIGGER AS $$
DECLARE
  affected_driver_user_id UUID;
  affected_period_id UUID;
BEGIN
  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.driver_user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.driver_user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    -- Encontrar el company_payment_period_id
    SELECT cpp.id INTO affected_period_id
    FROM company_payment_periods cpp
    JOIN driver_period_calculations dpc ON cpp.id = dpc.company_payment_period_id
    WHERE dpc.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM public.auto_recalculate_driver_payment_period(affected_driver_user_id, affected_period_id);
      RAISE LOG 'auto_recalculate_on_other_income: Recálculo ejecutado para conductor % en período %', 
        affected_driver_user_id, affected_period_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para EXPENSE_INSTANCES
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_expense_instances()
RETURNS TRIGGER AS $$
DECLARE
  affected_driver_user_id UUID;
  affected_period_id UUID;
BEGIN
  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    -- Encontrar el company_payment_period_id
    SELECT cpp.id INTO affected_period_id
    FROM company_payment_periods cpp
    JOIN driver_period_calculations dpc ON cpp.id = dpc.company_payment_period_id
    WHERE dpc.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM public.auto_recalculate_driver_payment_period(affected_driver_user_id, affected_period_id);
      RAISE LOG 'auto_recalculate_on_expense_instances: Recálculo ejecutado para período %', affected_period_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CREAR LOS TRIGGERS
DROP TRIGGER IF EXISTS auto_recalculate_loads_trigger ON loads;
CREATE TRIGGER auto_recalculate_loads_trigger
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW EXECUTE FUNCTION auto_recalculate_on_loads();

DROP TRIGGER IF EXISTS auto_recalculate_fuel_expenses_trigger ON fuel_expenses;
CREATE TRIGGER auto_recalculate_fuel_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

DROP TRIGGER IF EXISTS auto_recalculate_other_income_trigger ON other_income;
CREATE TRIGGER auto_recalculate_other_income_trigger
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW EXECUTE FUNCTION auto_recalculate_on_other_income();

DROP TRIGGER IF EXISTS auto_recalculate_expense_instances_trigger ON expense_instances;
CREATE TRIGGER auto_recalculate_expense_instances_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expense_instances
  FOR EACH ROW EXECUTE FUNCTION auto_recalculate_on_expense_instances();

-- FASE 2: FUNCIÓN ACID PARA EXPENSE_INSTANCES
-- ===========================================

CREATE OR REPLACE FUNCTION public.create_expense_instance_with_validation(expense_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_payment_period_id UUID;
  target_company_id UUID;
  result_expense RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract payment period ID
  target_payment_period_id := (expense_data->>'payment_period_id')::UUID;
  IF target_payment_period_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_PAYMENT_PERIOD_REQUIRED';
  END IF;

  -- Get company from payment period
  SELECT cpp.company_id INTO target_company_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = target_payment_period_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_PAYMENT_PERIOD_NOT_FOUND';
  END IF;

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_EXPENSE_INSTANCES';
  END IF;

  -- Validate required fields
  IF NULLIF((expense_data->>'amount')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_AMOUNT_REQUIRED';
  END IF;

  IF NULLIF((expense_data->>'expense_type_id')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_EXPENSE_TYPE_REQUIRED';
  END IF;

  IF NULLIF((expense_data->>'user_id')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_ID_REQUIRED';
  END IF;

  -- Create expense instance
  INSERT INTO expense_instances (
    payment_period_id,
    expense_type_id,
    user_id,
    amount,
    description,
    expense_date,
    priority,
    is_critical,
    status,
    created_by,
    applied_by,
    applied_at
  ) VALUES (
    target_payment_period_id,
    (expense_data->>'expense_type_id')::UUID,
    (expense_data->>'user_id')::UUID,
    (expense_data->>'amount')::NUMERIC,
    expense_data->>'description',
    COALESCE((expense_data->>'expense_date')::DATE, CURRENT_DATE),
    COALESCE((expense_data->>'priority')::INTEGER, 5),
    COALESCE((expense_data->>'is_critical')::BOOLEAN, false),
    'applied',
    current_user_id,
    current_user_id,
    now()
  ) RETURNING * INTO result_expense;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', 'CREATE',
    'message', 'Deducción creada exitosamente',
    'expense', row_to_json(result_expense),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;

-- FASE 3: FUNCIÓN DE VALIDACIÓN DE INTEGRIDAD
-- ==========================================

CREATE OR REPLACE FUNCTION public.validate_payment_calculation_integrity(target_company_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  integrity_issues JSONB := '[]'::JSONB;
  issue_count INTEGER := 0;
  period_record RECORD;
  calc_record RECORD;
  expected_total_income NUMERIC;
  expected_net_payment NUMERIC;
  loads_total NUMERIC;
  fuel_total NUMERIC;
  other_income_total NUMERIC;
  deductions_total NUMERIC;
BEGIN
  -- Verificar permisos del usuario
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_VALIDATE_INTEGRITY';
  END IF;

  -- Iterar por cada período de pago de la empresa
  FOR period_record IN
    SELECT id, period_start_date, period_end_date, status
    FROM company_payment_periods 
    WHERE company_id = target_company_id
    AND status NOT IN ('closed', 'archived')
    ORDER BY period_start_date DESC
    LIMIT 10 -- Solo revisar los últimos 10 períodos
  LOOP
    -- Iterar por cada cálculo de conductor en el período
    FOR calc_record IN
      SELECT 
        dpc.*,
        dp.user_id as profile_user_id
      FROM driver_period_calculations dpc
      LEFT JOIN driver_profiles dp ON dpc.driver_user_id = dp.user_id
      WHERE dpc.company_payment_period_id = period_record.id
    LOOP
      -- Calcular totales esperados desde las tablas base
      
      -- 1. Total de cargas (gross_earnings)
      SELECT COALESCE(SUM(
        CASE 
          WHEN l.load_status = 'delivered' THEN COALESCE(l.driver_pay_amount, 0)
          ELSE 0
        END
      ), 0) INTO loads_total
      FROM loads l
      WHERE l.driver_user_id = calc_record.driver_user_id
      AND l.payment_period_id = calc_record.id;

      -- 2. Total de combustible (fuel_expenses)
      SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_total
      FROM fuel_expenses fe
      WHERE fe.driver_user_id = calc_record.driver_user_id
      AND fe.payment_period_id = calc_record.id;

      -- 3. Total de otros ingresos (other_income)
      SELECT COALESCE(SUM(oi.amount), 0) INTO other_income_total
      FROM other_income oi
      WHERE oi.driver_user_id = calc_record.driver_user_id
      AND oi.payment_period_id = calc_record.id;

      -- 4. Total de deducciones (total_deductions)
      SELECT COALESCE(SUM(ei.amount), 0) INTO deductions_total
      FROM expense_instances ei
      WHERE ei.user_id = calc_record.driver_user_id
      AND ei.payment_period_id = calc_record.id
      AND ei.status = 'applied';

      -- Calcular totales esperados
      expected_total_income := loads_total + other_income_total;
      expected_net_payment := expected_total_income - fuel_total - deductions_total;

      -- Verificar inconsistencias
      IF ABS(calc_record.gross_earnings - loads_total) > 0.01 THEN
        integrity_issues := integrity_issues || jsonb_build_object(
          'type', 'GROSS_EARNINGS_MISMATCH',
          'period_id', period_record.id,
          'driver_user_id', calc_record.driver_user_id,
          'calculated', calc_record.gross_earnings,
          'expected', loads_total,
          'difference', calc_record.gross_earnings - loads_total
        );
        issue_count := issue_count + 1;
      END IF;

      IF ABS(calc_record.fuel_expenses - fuel_total) > 0.01 THEN
        integrity_issues := integrity_issues || jsonb_build_object(
          'type', 'FUEL_EXPENSES_MISMATCH',
          'period_id', period_record.id,
          'driver_user_id', calc_record.driver_user_id,
          'calculated', calc_record.fuel_expenses,
          'expected', fuel_total,
          'difference', calc_record.fuel_expenses - fuel_total
        );
        issue_count := issue_count + 1;
      END IF;

      IF ABS(calc_record.other_income - other_income_total) > 0.01 THEN
        integrity_issues := integrity_issues || jsonb_build_object(
          'type', 'OTHER_INCOME_MISMATCH',
          'period_id', period_record.id,
          'driver_user_id', calc_record.driver_user_id,
          'calculated', calc_record.other_income,
          'expected', other_income_total,
          'difference', calc_record.other_income - other_income_total
        );
        issue_count := issue_count + 1;
      END IF;

      IF ABS(calc_record.total_deductions - deductions_total) > 0.01 THEN
        integrity_issues := integrity_issues || jsonb_build_object(
          'type', 'TOTAL_DEDUCTIONS_MISMATCH',
          'period_id', period_record.id,
          'driver_user_id', calc_record.driver_user_id,
          'calculated', calc_record.total_deductions,
          'expected', deductions_total,
          'difference', calc_record.total_deductions - deductions_total
        );
        issue_count := issue_count + 1;
      END IF;

      IF ABS(calc_record.total_income - expected_total_income) > 0.01 THEN
        integrity_issues := integrity_issues || jsonb_build_object(
          'type', 'TOTAL_INCOME_MISMATCH',
          'period_id', period_record.id,
          'driver_user_id', calc_record.driver_user_id,
          'calculated', calc_record.total_income,
          'expected', expected_total_income,
          'difference', calc_record.total_income - expected_total_income
        );
        issue_count := issue_count + 1;
      END IF;

      IF ABS(calc_record.net_payment - expected_net_payment) > 0.01 THEN
        integrity_issues := integrity_issues || jsonb_build_object(
          'type', 'NET_PAYMENT_MISMATCH',
          'period_id', period_record.id,
          'driver_user_id', calc_record.driver_user_id,
          'calculated', calc_record.net_payment,
          'expected', expected_net_payment,
          'difference', calc_record.net_payment - expected_net_payment
        );
        issue_count := issue_count + 1;
      END IF;

    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', target_company_id,
    'total_issues', issue_count,
    'integrity_status', CASE WHEN issue_count = 0 THEN 'HEALTHY' ELSE 'ISSUES_FOUND' END,
    'issues', integrity_issues,
    'checked_at', now(),
    'checked_by', auth.uid()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_INTEGRITY_VALIDATION_FAILED: %', SQLERRM;
END;
$$;

-- FASE 4: FUNCIÓN DE CORRECCIÓN AUTOMÁTICA
-- =========================================

CREATE OR REPLACE FUNCTION public.auto_fix_payment_calculation_issues(target_company_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  validation_result JSONB;
  issue JSONB;
  fixed_count INTEGER := 0;
  total_issues INTEGER := 0;
  recalc_result JSONB;
BEGIN
  -- Validar permisos
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_AUTO_FIX';
  END IF;

  -- Primero obtener el reporte de integridad
  validation_result := validate_payment_calculation_integrity(target_company_id);
  total_issues := (validation_result->>'total_issues')::INTEGER;

  -- Si no hay issues, no hay nada que arreglar
  IF total_issues = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No se encontraron inconsistencias',
      'total_issues', 0,
      'fixed_count', 0,
      'company_id', target_company_id
    );
  END IF;

  -- Iterar por cada issue y corregir mediante recálculo
  FOR issue IN SELECT * FROM jsonb_array_elements(validation_result->'issues')
  LOOP
    BEGIN
      -- Ejecutar recálculo del período del conductor afectado
      SELECT recalculate_driver_payment_period(
        (issue->>'period_id')::UUID,
        (issue->>'driver_user_id')::UUID
      ) INTO recalc_result;

      IF recalc_result IS NOT NULL AND (recalc_result->>'success')::BOOLEAN = true THEN
        fixed_count := fixed_count + 1;
        RAISE LOG 'auto_fix_payment_calculation_issues: Corregido issue % para conductor % en período %', 
          issue->>'type', issue->>'driver_user_id', issue->>'period_id';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'auto_fix_payment_calculation_issues: Error corrigiendo issue %: %', 
        issue->>'type', SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Se corrigieron %s de %s inconsistencias encontradas', fixed_count, total_issues),
    'total_issues', total_issues,
    'fixed_count', fixed_count,
    'company_id', target_company_id,
    'fixed_at', now(),
    'fixed_by', auth.uid()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_AUTO_FIX_FAILED: %', SQLERRM;
END;
$$;

-- Log de implementación
INSERT INTO archive_logs (
  operation_type,
  table_name,
  details,
  triggered_by,
  records_affected,
  status
) VALUES (
  'SYSTEM_IMPLEMENTATION',
  'payment_calculation_system',
  jsonb_build_object(
    'implementation', 'PLAN_COMPLETO_CALCULO_AUTOMATICO_v1.0',
    'phases', jsonb_build_array(
      'TRIGGERS_RECALCULO_AUTOMATICO',
      'FUNCION_ACID_EXPENSE_INSTANCES', 
      'VALIDACION_INTEGRIDAD',
      'CORRECCION_AUTOMATICA'
    ),
    'triggers_created', jsonb_build_array(
      'auto_recalculate_loads_trigger',
      'auto_recalculate_fuel_expenses_trigger', 
      'auto_recalculate_other_income_trigger',
      'auto_recalculate_expense_instances_trigger'
    ),
    'functions_created', jsonb_build_array(
      'auto_recalculate_driver_payment_period',
      'create_expense_instance_with_validation',
      'validate_payment_calculation_integrity',
      'auto_fix_payment_calculation_issues'
    )
  ),
  auth.uid(),
  8, -- 4 triggers + 4 functions
  'completed'
);