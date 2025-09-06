-- Crear solo la función principal y el trigger más importante para evitar deadlock
-- Solo el trigger de UPDATE en loads que es lo que necesitamos para el problema reportado

-- 1. Crear función optimizada para recálculo automático
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_simple()
RETURNS TRIGGER AS $$
DECLARE
  target_driver_user_id UUID;
  target_payment_period_id UUID;
  calculation_id UUID;
  recalc_result JSONB;
BEGIN
  -- Solo para UPDATE - el caso más importante para el problema reportado
  target_driver_user_id := NEW.driver_user_id;
  target_payment_period_id := NEW.payment_period_id;

  -- Solo proceder si hay un conductor y un período de pago asignados
  IF target_driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    
    -- Buscar el cálculo del conductor para este período
    SELECT dpc.id INTO calculation_id
    FROM driver_period_calculations dpc
    WHERE dpc.id = target_payment_period_id
    AND dpc.driver_user_id = target_driver_user_id
    LIMIT 1;

    -- Si existe el cálculo, recalcularlo
    IF calculation_id IS NOT NULL THEN
      RAISE NOTICE '🔄 Auto-recalculating period % for driver %', calculation_id, target_driver_user_id;
      
      -- Llamar a la función de recálculo
      SELECT calculate_driver_payment_period_with_validation(calculation_id) INTO recalc_result;
      
      IF (recalc_result->>'success')::boolean = true THEN
        RAISE NOTICE '✅ Auto-recalculation successful for period %', calculation_id;
      ELSE
        RAISE WARNING '⚠️ Auto-recalculation error: %', recalc_result->>'message';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Crear solo el trigger de UPDATE para loads (el caso más crítico)
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_update ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_update
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  WHEN (OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
        OLD.dispatching_percentage IS DISTINCT FROM NEW.dispatching_percentage OR
        OLD.factoring_percentage IS DISTINCT FROM NEW.factoring_percentage OR
        OLD.leasing_percentage IS DISTINCT FROM NEW.leasing_percentage)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

COMMENT ON FUNCTION public.auto_recalculate_driver_payment_period_simple() IS 'Función simplificada para recalcular automáticamente cuando se editan cargas';
COMMENT ON TRIGGER trigger_simple_auto_recalc_loads_update ON public.loads IS 'Recalcula automáticamente cuando se editan montos o porcentajes de una carga';