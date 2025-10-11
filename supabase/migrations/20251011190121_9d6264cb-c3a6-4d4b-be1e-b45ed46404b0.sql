-- ===============================================
-- 🚨 FASE 4-5: ACTUALIZAR FUNCIONES SQL Y TRIGGERS
-- Migración de driver_period_calculations -> user_payment_periods
-- ===============================================

-- ============================================
-- 1. ACTUALIZAR FUNCIÓN DE AUTO-RECÁLCULO PRINCIPAL
-- ============================================

DROP FUNCTION IF EXISTS auto_recalculate_driver_period() CASCADE;

CREATE OR REPLACE FUNCTION auto_recalculate_user_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_calculation_id UUID;
  company_period_id UUID;
  target_user_id UUID;
  recalc_flag TEXT;
BEGIN
  recalc_flag := current_setting('app.recalc_in_progress', true);
  IF recalc_flag = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'loads' THEN
      target_user_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      company_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'fuel_expenses' THEN
      target_user_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      SELECT upp.company_payment_period_id INTO company_period_id
      FROM user_payment_periods upp
      WHERE upp.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'expense_instances' THEN
      SELECT upp.user_id, upp.company_payment_period_id 
      INTO target_user_id, company_period_id
      FROM user_payment_periods upp
      WHERE upp.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'other_income' THEN
      target_user_id := COALESCE(NEW.user_id, OLD.user_id);
      SELECT upp.company_payment_period_id INTO company_period_id
      FROM user_payment_periods upp
      WHERE upp.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  END CASE;

  IF target_user_id IS NULL OR company_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF EXISTS (
    SELECT 1 FROM company_payment_periods 
    WHERE id = company_period_id AND is_locked = true
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id INTO target_calculation_id
  FROM user_payment_periods
  WHERE company_payment_period_id = company_period_id
    AND user_id = target_user_id;

  IF target_calculation_id IS NULL THEN
    INSERT INTO user_payment_periods (
      company_payment_period_id,
      user_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      has_negative_balance,
      payment_status
    ) VALUES (
      company_period_id,
      target_user_id,
      0, 0, 0, 0, false,
      'calculated'
    ) RETURNING id INTO target_calculation_id;
  END IF;

  PERFORM calculate_user_payment_period_with_validation(target_calculation_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- 2. ACTUALIZAR FUNCIÓN DE AUTO-RECÁLCULO PARA OTHER_INCOME
-- ============================================

DROP FUNCTION IF EXISTS auto_recalculate_on_other_income() CASCADE;

CREATE OR REPLACE FUNCTION auto_recalculate_on_other_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_user_id UUID;
  affected_period_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_user_id := NEW.user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  IF affected_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    SELECT cpp.id INTO affected_period_id
    FROM company_payment_periods cpp
    JOIN user_payment_periods upp ON cpp.id = upp.company_payment_period_id
    WHERE upp.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_user_period();
      RAISE LOG 'auto_recalculate_on_other_income: Recálculo ejecutado para usuario % en período %', 
        affected_user_id, affected_period_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- 3. ACTUALIZAR FUNCIÓN DE DIAGNÓSTICO
-- ============================================

DROP FUNCTION IF EXISTS diagnose_payment_period_calculations();

CREATE OR REPLACE FUNCTION diagnose_payment_period_calculations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB := '{}'::jsonb;
  recent_periods_count INTEGER;
  recent_calculations_count INTEGER;
  failed_calculations_count INTEGER;
  pending_loads_count INTEGER;
  orphaned_calculations_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_periods_count
  FROM company_payment_periods 
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO recent_calculations_count
  FROM user_payment_periods upp
  JOIN company_payment_periods cpp ON upp.company_payment_period_id = cpp.id
  WHERE cpp.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO failed_calculations_count
  FROM user_payment_periods upp
  WHERE upp.gross_earnings = 0 
    AND upp.fuel_expenses = 0 
    AND upp.total_deductions = 0 
    AND upp.other_income = 0
    AND upp.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO pending_loads_count
  FROM loads l
  WHERE l.payment_period_id IS NULL
    AND l.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO orphaned_calculations_count
  FROM user_payment_periods upp
  WHERE NOT EXISTS (
    SELECT 1 FROM loads l 
    WHERE l.driver_user_id = upp.user_id 
    AND l.payment_period_id = upp.id
  )
  AND upp.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  result := jsonb_build_object(
    'recent_periods_count', recent_periods_count,
    'recent_calculations_count', recent_calculations_count,
    'failed_calculations_count', failed_calculations_count,
    'pending_loads_count', pending_loads_count,
    'orphaned_calculations_count', orphaned_calculations_count,
    'diagnosis_date', now(),
    'status', CASE 
      WHEN failed_calculations_count > 0 THEN 'PROBLEMAS_DETECTADOS'
      WHEN pending_loads_count > 0 THEN 'CARGAS_SIN_PERIODO'
      WHEN orphaned_calculations_count > 0 THEN 'CALCULOS_HUERFANOS'
      ELSE 'NORMAL'
    END,
    'recommendations', CASE
      WHEN failed_calculations_count > 0 THEN 'Ejecutar recálculo para corregir cálculos con valores cero'
      WHEN pending_loads_count > 0 THEN 'Asignar períodos a las cargas pendientes'
      WHEN orphaned_calculations_count > 0 THEN 'Verificar integridad entre cargas y cálculos'
      ELSE 'Sistema funcionando correctamente'
    END
  );
  
  RETURN result;
END;
$function$;

-- ============================================
-- 4. ACTUALIZAR FUNCIÓN DE CORRECCIÓN SEGURA
-- ============================================

DROP FUNCTION IF EXISTS fix_payment_period_calculations_safe();

CREATE OR REPLACE FUNCTION fix_payment_period_calculations_safe()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calc_record RECORD;
  fixed_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSONB;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Solo superadmins pueden ejecutar esta función';
  END IF;
  
  FOR calc_record IN 
    SELECT upp.id, upp.user_id, upp.company_payment_period_id
    FROM user_payment_periods upp
    JOIN company_payment_periods cpp ON upp.company_payment_period_id = cpp.id
    WHERE upp.gross_earnings = 0 
      AND upp.fuel_expenses = 0 
      AND upp.total_deductions = 0 
      AND upp.other_income = 0
      AND cpp.is_locked = false
      AND upp.payment_status != 'paid'
      AND cpp.created_at >= CURRENT_DATE - INTERVAL '30 days'
  LOOP
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(calc_record.id);
      fixed_count := fixed_count + 1;
      
      RAISE NOTICE 'Fixed calculation % for user %', 
        calc_record.id, calc_record.user_id;
        
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'Error fixing calculation %: %', 
        calc_record.id, SQLERRM;
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'fixed_calculations', fixed_count,
    'error_count', error_count,
    'execution_time', now(),
    'executed_by', current_user_id,
    'message', format('Se corrigieron %s cálculos con %s errores', fixed_count, error_count)
  );
  
  RETURN result;
END;
$function$;

-- ============================================
-- 5. RECREAR TRIGGERS CON NUEVAS FUNCIONES
-- ============================================

-- Trigger para loads
DROP TRIGGER IF EXISTS trigger_recalc_on_load_change ON loads;
CREATE TRIGGER trigger_recalc_on_load_change
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_user_period();

-- Trigger para fuel_expenses
DROP TRIGGER IF EXISTS trigger_recalc_on_fuel_change ON fuel_expenses;
CREATE TRIGGER trigger_recalc_on_fuel_change
  AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_user_period();

-- Trigger para expense_instances
DROP TRIGGER IF EXISTS trigger_recalc_on_expense_change ON expense_instances;
CREATE TRIGGER trigger_recalc_on_expense_change
  AFTER INSERT OR UPDATE OR DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_user_period();

-- Trigger para other_income
DROP TRIGGER IF EXISTS trigger_recalc_on_income_change ON other_income;
CREATE TRIGGER trigger_recalc_on_income_change
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_other_income();

-- ============================================
-- 6. AUDIT LOG
-- ============================================

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('sql_functions', 'all_functions_and_triggers_updated', 'completed'),
       ('phase_summary', 'phase_4_5_sql_migration_completed', 'completed');