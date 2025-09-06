-- Crear trigger para recalcular automáticamente períodos de pago cuando se editan cargas
-- Esto resolverá el problema donde editar cargas no actualiza los cálculos del conductor

-- 1. Crear función que recalcula el período de pago de un conductor automáticamente
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period()
RETURNS TRIGGER AS $$
DECLARE
  target_driver_user_id UUID;
  target_payment_period_id UUID;
  calculation_id UUID;
  recalc_result JSONB;
BEGIN
  -- Determinar el driver_user_id según la operación
  IF TG_OP = 'DELETE' THEN
    target_driver_user_id := OLD.driver_user_id;
    target_payment_period_id := OLD.payment_period_id;
  ELSE
    target_driver_user_id := NEW.driver_user_id;
    target_payment_period_id := NEW.payment_period_id;
  END IF;

  -- Solo proceder si hay un conductor y un período de pago asignados
  IF target_driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    
    -- Buscar el cálculo del conductor para este período
    SELECT dpc.id INTO calculation_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.driver_user_id = target_driver_user_id
    AND cpp.id = target_payment_period_id
    LIMIT 1;

    -- Si no existe el cálculo, buscarlo por período de cálculo del conductor
    IF calculation_id IS NULL THEN
      SELECT id INTO calculation_id
      FROM driver_period_calculations
      WHERE id = target_payment_period_id
      AND driver_user_id = target_driver_user_id
      LIMIT 1;
    END IF;

    -- Si existe el cálculo, recalcularlo
    IF calculation_id IS NOT NULL THEN
      RAISE NOTICE '🔄 Auto-recalculando período % para conductor %', calculation_id, target_driver_user_id;
      
      -- Llamar a la función de recálculo
      SELECT calculate_driver_payment_period_with_validation(calculation_id) INTO recalc_result;
      
      IF (recalc_result->>'success')::boolean = true THEN
        RAISE NOTICE '✅ Recálculo automático exitoso para período %', calculation_id;
      ELSE
        RAISE WARNING '⚠️ Error en recálculo automático: %', recalc_result->>'message';
      END IF;
    ELSE
      RAISE NOTICE '📝 No se encontró cálculo existente para conductor % en período %', target_driver_user_id, target_payment_period_id;
    END IF;
  END IF;

  -- Retornar el registro apropiado según la operación
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Crear triggers en la tabla loads para recálculo automático
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_insert ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_update ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_delete ON public.loads;

-- Trigger para INSERT de cargas
CREATE TRIGGER trigger_auto_recalculate_on_load_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

-- Trigger para UPDATE de cargas
CREATE TRIGGER trigger_auto_recalculate_on_load_update
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  WHEN (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id OR 
        OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id OR
        OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
        OLD.dispatching_percentage IS DISTINCT FROM NEW.dispatching_percentage OR
        OLD.factoring_percentage IS DISTINCT FROM NEW.factoring_percentage OR
        OLD.leasing_percentage IS DISTINCT FROM NEW.leasing_percentage OR
        OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

-- Trigger para DELETE de cargas
CREATE TRIGGER trigger_auto_recalculate_on_load_delete
  AFTER DELETE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

-- 3. Crear triggers similares para other_income
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_other_income_insert ON public.other_income;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_other_income_update ON public.other_income;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_other_income_delete ON public.other_income;

CREATE TRIGGER trigger_auto_recalculate_on_other_income_insert
  AFTER INSERT ON public.other_income
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

CREATE TRIGGER trigger_auto_recalculate_on_other_income_update
  AFTER UPDATE ON public.other_income
  FOR EACH ROW
  WHEN (OLD.user_id IS DISTINCT FROM NEW.user_id OR 
        OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id OR
        OLD.amount IS DISTINCT FROM NEW.amount)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

CREATE TRIGGER trigger_auto_recalculate_on_other_income_delete
  AFTER DELETE ON public.other_income
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

-- 4. Crear triggers para fuel_expenses
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_fuel_expenses_insert ON public.fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_fuel_expenses_update ON public.fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_fuel_expenses_delete ON public.fuel_expenses;

CREATE TRIGGER trigger_auto_recalculate_on_fuel_expenses_insert
  AFTER INSERT ON public.fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

CREATE TRIGGER trigger_auto_recalculate_on_fuel_expenses_update
  AFTER UPDATE ON public.fuel_expenses
  FOR EACH ROW
  WHEN (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id OR 
        OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id OR
        OLD.total_amount IS DISTINCT FROM NEW.total_amount)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

CREATE TRIGGER trigger_auto_recalculate_on_fuel_expenses_delete
  AFTER DELETE ON public.fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period();

COMMENT ON FUNCTION public.auto_recalculate_driver_payment_period() IS 'Función para recalcular automáticamente los períodos de pago cuando se modifican cargas, ingresos adicionales o gastos de combustible';
COMMENT ON TRIGGER trigger_auto_recalculate_on_load_update ON public.loads IS 'Recalcula automáticamente los pagos del conductor cuando se edita una carga';