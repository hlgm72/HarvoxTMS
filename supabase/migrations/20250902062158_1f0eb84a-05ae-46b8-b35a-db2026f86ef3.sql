-- ===============================================
-- 🚨 IMPLEMENTACIÓN DE RECÁLCULO AUTOMÁTICO COMPLETO
-- ===============================================
-- 
-- PROBLEMA: Los triggers actuales fallan porque llaman a recalculate_driver_payment_period()
-- que no existe. La función correcta es calculate_driver_payment_period_v2()
-- 
-- SOLUCIÓN: Crear la función faltante y mejorar el sistema de recálculo automático

-- 1. CREAR LA FUNCIÓN FALTANTE DE RECÁLCULO
-- ==========================================

CREATE OR REPLACE FUNCTION public.recalculate_driver_payment_period(
  target_company_payment_period_id UUID,
  target_driver_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  target_calculation_id UUID;
  recalc_result JSONB;
  current_user_id UUID;
BEGIN
  -- Log de inicio del recálculo
  RAISE LOG 'recalculate_driver_payment_period: Iniciando para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Obtener el ID del cálculo del conductor para este período
  SELECT id INTO target_calculation_id
  FROM driver_period_calculations 
  WHERE company_payment_period_id = target_company_payment_period_id
    AND driver_user_id = target_driver_user_id;

  -- Si no existe el cálculo, crearlo
  IF target_calculation_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      total_income,
      net_payment,
      payment_status,
      has_negative_balance
    ) VALUES (
      target_driver_user_id,
      target_company_payment_period_id,
      0, 0, 0, 0, 0, 0,
      'calculated',
      false
    ) RETURNING id INTO target_calculation_id;

    RAISE LOG 'recalculate_driver_payment_period: Creado nuevo cálculo %', target_calculation_id;
  END IF;

  -- Llamar a la función de cálculo existente
  SELECT calculate_driver_payment_period_v2(target_calculation_id) INTO recalc_result;

  -- Verificar resultado
  IF recalc_result IS NULL THEN
    RAISE WARNING 'recalculate_driver_payment_period: calculate_driver_payment_period_v2 retornó NULL';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'calculate_driver_payment_period_v2 returned NULL',
      'calculation_id', target_calculation_id
    );
  END IF;

  RAISE LOG 'recalculate_driver_payment_period: Completado exitosamente para %', target_calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', target_calculation_id,
    'period_id', target_company_payment_period_id,
    'driver_user_id', target_driver_user_id,
    'recalculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'recalculate_driver_payment_period: Error - %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'calculation_id', target_calculation_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. MEJORAR TRIGGERS DE RECÁLCULO AUTOMÁTICO
-- ===========================================

-- Trigger mejorado para LOADS
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_load_changes()
RETURNS TRIGGER AS $$
DECLARE
  affected_driver_user_id UUID;
  affected_period_id UUID;
BEGIN
  -- Determinar datos según operación
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.driver_user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.driver_user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período asignados
  IF affected_driver_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    -- Obtener company_payment_period_id del driver_period_calculation
    SELECT company_payment_period_id INTO affected_period_id
    FROM driver_period_calculations dpc
    WHERE dpc.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM public.recalculate_driver_payment_period(affected_period_id, affected_driver_user_id);
      RAISE LOG 'auto_recalculate_on_load_changes: Recálculo ejecutado para período % (operación: %)', 
        affected_period_id, TG_OP;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recrear triggers para LOADS con la nueva función
DROP TRIGGER IF EXISTS auto_recalculate_loads_trigger ON public.loads;
CREATE TRIGGER auto_recalculate_loads_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.loads
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_recalculate_on_load_changes();

-- 3. TRIGGERS PARA FUEL_EXPENSES Y EXPENSE_INSTANCES
-- ==================================================

-- Trigger para fuel_expenses
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_fuel_changes()
RETURNS TRIGGER AS $$
DECLARE
  affected_driver_user_id UUID;
  affected_period_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.driver_user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.driver_user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  IF affected_driver_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO affected_period_id
    FROM driver_period_calculations dpc
    WHERE dpc.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM public.recalculate_driver_payment_period(affected_period_id, affected_driver_user_id);
      RAISE LOG 'auto_recalculate_on_fuel_changes: Recálculo ejecutado para período %', affected_period_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_recalculate_fuel_trigger ON public.fuel_expenses;
CREATE TRIGGER auto_recalculate_fuel_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_expenses
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_recalculate_on_fuel_changes();

-- Trigger para expense_instances (deducciones)
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_expense_changes()
RETURNS TRIGGER AS $$
DECLARE
  affected_driver_user_id UUID;
  affected_period_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.user_id;
    affected_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.user_id;
    affected_period_id := NEW.payment_period_id;
  END IF;

  IF affected_driver_user_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO affected_period_id
    FROM driver_period_calculations dpc
    WHERE dpc.id = affected_period_id;

    IF affected_period_id IS NOT NULL THEN
      PERFORM public.recalculate_driver_payment_period(affected_period_id, affected_driver_user_id);
      RAISE LOG 'auto_recalculate_on_expense_changes: Recálculo ejecutado para período %', affected_period_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_recalculate_expense_trigger ON public.expense_instances;
CREATE TRIGGER auto_recalculate_expense_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_instances
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_recalculate_on_expense_changes();

-- 4. FUNCIÓN DE VALIDACIÓN DE CONSISTENCIA
-- ========================================

CREATE OR REPLACE FUNCTION public.validate_driver_calculation_consistency(
  target_calculation_id UUID
) RETURNS JSONB AS $$
DECLARE
  calc_data RECORD;
  expected_gross NUMERIC := 0;
  expected_fuel NUMERIC := 0;
  expected_deductions NUMERIC := 0;
  expected_other NUMERIC := 0;
  expected_total NUMERIC := 0;
  expected_net NUMERIC := 0;
  issues JSONB[] := '{}';
BEGIN
  -- Obtener datos del cálculo
  SELECT * INTO calc_data
  FROM driver_period_calculations
  WHERE id = target_calculation_id;

  IF calc_data IS NULL THEN
    RETURN jsonb_build_object('error', 'Calculation not found');
  END IF;

  -- Calcular valores esperados
  SELECT COALESCE(SUM(l.total_amount), 0) INTO expected_gross
  FROM loads l
  WHERE l.payment_period_id = target_calculation_id
    AND l.driver_user_id = calc_data.driver_user_id
    AND l.status NOT IN ('cancelled', 'rejected');

  SELECT COALESCE(SUM(fe.total_amount), 0) INTO expected_fuel
  FROM fuel_expenses fe
  WHERE fe.payment_period_id = target_calculation_id
    AND fe.driver_user_id = calc_data.driver_user_id;

  SELECT COALESCE(SUM(ei.amount), 0) INTO expected_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = target_calculation_id
    AND ei.user_id = calc_data.driver_user_id;

  expected_total := expected_gross + expected_other;
  expected_net := expected_total - expected_fuel - expected_deductions;

  -- Verificar consistencia
  IF ABS(calc_data.gross_earnings - expected_gross) > 0.01 THEN
    issues := issues || jsonb_build_object(
      'field', 'gross_earnings',
      'expected', expected_gross,
      'actual', calc_data.gross_earnings
    );
  END IF;

  IF ABS(calc_data.fuel_expenses - expected_fuel) > 0.01 THEN
    issues := issues || jsonb_build_object(
      'field', 'fuel_expenses', 
      'expected', expected_fuel,
      'actual', calc_data.fuel_expenses
    );
  END IF;

  IF ABS(calc_data.total_deductions - expected_deductions) > 0.01 THEN
    issues := issues || jsonb_build_object(
      'field', 'total_deductions',
      'expected', expected_deductions, 
      'actual', calc_data.total_deductions
    );
  END IF;

  RETURN jsonb_build_object(
    'consistent', array_length(issues, 1) IS NULL,
    'issues', issues,
    'calculation_id', target_calculation_id,
    'checked_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;