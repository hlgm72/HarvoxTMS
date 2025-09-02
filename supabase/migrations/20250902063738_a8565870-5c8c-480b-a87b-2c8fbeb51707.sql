-- ===================================================================
-- 🚨 SOLUCIÓN DEFINITIVA: Crear triggers faltantes y corregir funciones
-- ===================================================================

-- 1) Corregir regenerate_percentage_deductions_for_period 
CREATE OR REPLACE FUNCTION public.regenerate_percentage_deductions_for_period(target_period_calculation_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  calc_record RECORD;
  comp_record RECORD;
  var_gross_earnings NUMERIC := 0;
  var_factoring_amount NUMERIC := 0;
  var_dispatching_amount NUMERIC := 0;
  var_leasing_amount NUMERIC := 0;
  generated_count INTEGER := 0;
  factoring_type_id UUID;
  dispatching_type_id UUID;
  leasing_type_id UUID;
BEGIN
  RAISE LOG 'regenerate_percentage_deductions: Iniciando para período %', target_period_calculation_id;

  -- Obtener información del cálculo y empresa
  SELECT dpc.*, cpp.company_id INTO calc_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = target_period_calculation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado: %', target_period_calculation_id;
  END IF;

  SELECT * INTO comp_record
  FROM companies WHERE id = calc_record.company_id;

  -- 🔧 FIX: Buscar cargas usando company_payment_period_id (NO period_calculation_id)
  SELECT COALESCE(SUM(l.total_amount), 0) INTO var_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.payment_period_id = calc_record.company_payment_period_id  -- ✅ CORREGIDO
    AND l.status IN ('assigned', 'in_transit', 'delivered');

  RAISE LOG 'regenerate_percentage_deductions: Gross earnings: $% para período %', var_gross_earnings, target_period_calculation_id;

  -- Solo continuar si hay gross earnings
  IF var_gross_earnings > 0 THEN
    -- Obtener IDs de tipos de gastos de porcentaje
    SELECT id INTO factoring_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%factoring%' LIMIT 1;
    SELECT id INTO dispatching_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%dispatching%' LIMIT 1;
    SELECT id INTO leasing_type_id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%leasing%' LIMIT 1;

    -- Eliminar deducciones de porcentaje existentes para este período
    DELETE FROM expense_instances
    WHERE payment_period_id = target_period_calculation_id
      AND user_id = calc_record.driver_user_id
      AND expense_type_id IN (factoring_type_id, dispatching_type_id, leasing_type_id);

    -- Generar factoring si aplica
    IF comp_record.default_factoring_percentage > 0 AND factoring_type_id IS NOT NULL THEN
      var_factoring_amount := var_gross_earnings * comp_record.default_factoring_percentage / 100;
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, status
      ) VALUES (
        target_period_calculation_id, calc_record.driver_user_id, factoring_type_id,
        var_factoring_amount, 'Factoring (' || comp_record.default_factoring_percentage || '%)', 'applied'
      );
      generated_count := generated_count + 1;
    END IF;

    -- Generar dispatching si aplica
    IF comp_record.default_dispatching_percentage > 0 AND dispatching_type_id IS NOT NULL THEN
      var_dispatching_amount := var_gross_earnings * comp_record.default_dispatching_percentage / 100;
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, status
      ) VALUES (
        target_period_calculation_id, calc_record.driver_user_id, dispatching_type_id,
        var_dispatching_amount, 'Dispatching (' || comp_record.default_dispatching_percentage || '%)', 'applied'
      );
      generated_count := generated_count + 1;
    END IF;

    -- Generar leasing si aplica
    IF comp_record.default_leasing_percentage > 0 AND leasing_type_id IS NOT NULL THEN
      var_leasing_amount := var_gross_earnings * comp_record.default_leasing_percentage / 100;
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, status
      ) VALUES (
        target_period_calculation_id, calc_record.driver_user_id, leasing_type_id,
        var_leasing_amount, 'Leasing (' || comp_record.default_leasing_percentage || '%)', 'applied'
      );
      generated_count := generated_count + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'period_calculation_id', target_period_calculation_id,
    'gross_earnings', var_gross_earnings,
    'generated_deductions', generated_count,
    'factoring_amount', var_factoring_amount,
    'dispatching_amount', var_dispatching_amount,
    'leasing_amount', var_leasing_amount
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error regenerating deductions: %', SQLERRM;
END;
$$;

-- 2) CREAR TRIGGERS FALTANTES PARA LOADS
-- ===================================================================

-- Trigger para INSERT/UPDATE de loads
CREATE OR REPLACE FUNCTION public.trigger_auto_recalculate_on_loads()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  affected_period_id UUID;
  affected_driver_user_id UUID;
BEGIN
  -- Para INSERT/UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    affected_period_id := NEW.payment_period_id;
    affected_driver_user_id := NEW.driver_user_id;
  END IF;

  -- Solo proceder si tenemos período y conductor válidos
  IF affected_period_id IS NOT NULL AND affected_driver_user_id IS NOT NULL THEN
    PERFORM public.auto_recalculate_driver_payment_period(affected_driver_user_id, affected_period_id);
    RAISE LOG 'trigger_auto_recalculate_on_loads: Recálculo ejecutado para conductor % en período %', 
      affected_driver_user_id, affected_period_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para DELETE de loads 
CREATE OR REPLACE FUNCTION public.trigger_auto_recalculate_on_loads_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  affected_period_id UUID;
  affected_driver_user_id UUID;
BEGIN
  -- Para DELETE usamos OLD
  affected_period_id := OLD.payment_period_id;
  affected_driver_user_id := OLD.driver_user_id;

  -- Solo proceder si tenemos período y conductor válidos
  IF affected_period_id IS NOT NULL AND affected_driver_user_id IS NOT NULL THEN
    PERFORM public.auto_recalculate_driver_payment_period(affected_driver_user_id, affected_period_id);
    RAISE LOG 'trigger_auto_recalculate_on_loads_delete: Recálculo ejecutado para conductor % en período %', 
      affected_driver_user_id, affected_period_id;
  END IF;

  RETURN OLD;
END;
$$;

-- 3) CREAR LOS TRIGGERS EN LA TABLA LOADS
-- ===================================================================

-- Limpiar triggers existentes
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate_insert ON loads;
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate_update ON loads;
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate_delete ON loads;

-- Crear triggers activos
CREATE TRIGGER trigger_loads_auto_recalculate_insert
  AFTER INSERT ON loads
  FOR EACH ROW 
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

CREATE TRIGGER trigger_loads_auto_recalculate_update  
  AFTER UPDATE ON loads
  FOR EACH ROW 
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

CREATE TRIGGER trigger_loads_auto_recalculate_delete
  AFTER DELETE ON loads
  FOR EACH ROW 
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads_delete();

-- 4) LOG DE ÉXITO
RAISE LOG '🚀 TRIGGERS DE LOADS CREADOS EXITOSAMENTE - El recálculo automático ahora funcionará correctamente';