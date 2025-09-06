-- Crear triggers para INSERT y UPDATE de cargas
-- Agregar trigger para INSERT de cargas
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_insert ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

-- El trigger de UPDATE ya existe, pero lo recreamos para usar la nueva función
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_update ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_update
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL AND
        (OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
         OLD.dispatching_percentage IS DISTINCT FROM NEW.dispatching_percentage OR
         OLD.factoring_percentage IS DISTINCT FROM NEW.factoring_percentage OR
         OLD.leasing_percentage IS DISTINCT FROM NEW.leasing_percentage OR
         OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id OR
         OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id))
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

COMMENT ON FUNCTION public.ensure_driver_period_calculation_exists(UUID, UUID) IS 'Asegura que existe un driver_period_calculation para el conductor y período especificado';
COMMENT ON FUNCTION public.auto_recalculate_driver_payment_period_simple() IS 'Función mejorada v2.2 que crea automáticamente driver_period_calculations si no existen';
COMMENT ON TRIGGER trigger_simple_auto_recalc_loads_insert ON public.loads IS 'Crear automáticamente driver_period_calculations cuando se insertan cargas nuevas';
COMMENT ON TRIGGER trigger_simple_auto_recalc_loads_update ON public.loads IS 'Recalcular automáticamente cuando se editan cargas existentes';