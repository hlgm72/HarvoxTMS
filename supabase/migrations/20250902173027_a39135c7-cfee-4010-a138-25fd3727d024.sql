-- Recrear el trigger para que se dispare correctamente cuando se editan las cargas
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate ON loads;

CREATE OR REPLACE FUNCTION public.trigger_loads_recalculate()
RETURNS TRIGGER AS $$
DECLARE
  target_period_id UUID;
  target_driver_id UUID;
  target_company_id UUID;
BEGIN
  RAISE LOG '🔄 TRIGGER_LOADS: Operación % ejecutada en loads', TG_OP;
  
  -- Determinar los valores según la operación
  IF TG_OP = 'DELETE' THEN
    target_period_id := OLD.payment_period_id;
    target_driver_id := OLD.driver_user_id;
    RAISE LOG '🔄 TRIGGER_LOADS: OLD - período: %, driver: %', target_period_id, target_driver_id;
  ELSE
    target_period_id := NEW.payment_period_id;
    target_driver_id := NEW.driver_user_id;
    RAISE LOG '🔄 TRIGGER_LOADS: NEW - período: %, driver: %', target_period_id, target_driver_id;
  END IF;

  -- Si no hay período o conductor, salir
  IF target_period_id IS NULL OR target_driver_id IS NULL THEN
    RAISE LOG '❌ TRIGGER_LOADS: Faltan datos - período: %, driver: %', target_period_id, target_driver_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Obtener la empresa del período
  SELECT company_id INTO target_company_id
  FROM company_payment_periods
  WHERE id = target_period_id;

  IF target_company_id IS NULL THEN
    RAISE LOG '❌ TRIGGER_LOADS: No se encontró empresa para período %', target_period_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Ejecutar recálculo
  RAISE LOG '🔄 TRIGGER_LOADS: Ejecutando recálculo para driver % en período % (compañía %)', 
    target_driver_id, target_period_id, target_company_id;

  PERFORM auto_recalculate_driver_payment_period_v2(target_driver_id, target_period_id);
  
  RAISE LOG '✅ TRIGGER_LOADS: Recálculo completado para driver % en período %', 
    target_driver_id, target_period_id;

  RETURN COALESCE(NEW, OLD);
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ TRIGGER_LOADS ERROR: % - Driver: %, Período: %', SQLERRM, target_driver_id, target_period_id;
  -- No fallar el trigger, solo registrar el error
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear el trigger para INSERT, UPDATE y DELETE
CREATE TRIGGER trigger_loads_auto_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_loads_recalculate();