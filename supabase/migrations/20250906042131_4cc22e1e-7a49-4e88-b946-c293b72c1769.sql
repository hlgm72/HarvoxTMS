-- Limpiar triggers duplicados y conflictivos de la tabla loads
-- Solo mantener los triggers esenciales y los nuevos que creamos

-- 1. ELIMINAR TRIGGERS DUPLICADOS DE RECÁLCULO
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_insert ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_update ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_delete ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_change ON public.loads;
DROP TRIGGER IF EXISTS loads_auto_recalc_single_trigger ON public.loads;

-- 2. VERIFICAR QUE NUESTROS TRIGGERS ESTÉN CORRECTOS
-- Recrear el trigger de INSERT con logging mejorado
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_insert ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

-- Recrear el trigger de UPDATE con logging mejorado
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
         OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id OR
         OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

-- 3. VERIFICAR QUE LA FUNCIÓN EXISTE Y FUNCIONA
-- Test manual de la función para el caso de Diosvani
DO $$
DECLARE
  calculation_id UUID;
  test_result JSONB;
BEGIN
  -- Crear el driver_period_calculation manualmente para Diosvani
  SELECT ensure_driver_period_calculation_exists(
    '484d83b3-b928-46b3-9705-db225ddb9b0c'::UUID,  -- Diosvani user_id
    '91f545d0-0bd7-40ce-b61a-10f402a96bb5'::UUID   -- Period ID semana 36
  ) INTO calculation_id;
  
  RAISE NOTICE '✅ Driver calculation created/found: %', calculation_id;
  
  -- Verificar que se creó correctamente
  IF calculation_id IS NOT NULL THEN
    RAISE NOTICE '🎯 Payment report creado exitosamente para Diosvani en semana 36';
  ELSE
    RAISE NOTICE '❌ Error: No se pudo crear el payment report';
  END IF;
END $$;