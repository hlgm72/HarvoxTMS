-- 🚨 LIMPIEZA CRÍTICA: Eliminar TODOS los triggers duplicados y conflictivos en loads
-- Solo mantener el trigger correcto y funcional

-- 1. ELIMINAR TODOS LOS TRIGGERS OBSOLETOS
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate ON public.loads;
DROP TRIGGER IF EXISTS trigger_smart_recalculation ON public.loads;
DROP TRIGGER IF EXISTS trg_recalc_driver_period_after_load_insupd ON public.loads;
DROP TRIGGER IF EXISTS trg_recalc_driver_period_after_load_del ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_changes ON public.loads;
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate_insert ON public.loads;
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate_update ON public.loads;
DROP TRIGGER IF EXISTS trigger_loads_auto_recalculate_delete ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads ON public.loads;

-- 2. ELIMINAR FUNCIONES OBSOLETAS
DROP FUNCTION IF EXISTS trigger_loads_recalculate();
DROP FUNCTION IF EXISTS trigger_smart_payment_recalculation();
DROP FUNCTION IF EXISTS trigger_recalc_driver_period_after_load();
DROP FUNCTION IF EXISTS auto_recalculate_on_load_changes();
DROP FUNCTION IF EXISTS trigger_auto_recalculate_on_loads_delete();

-- 3. CREAR LA FUNCIÓN DEFINITIVA Y OPTIMIZADA
CREATE OR REPLACE FUNCTION auto_recalculate_on_loads_final()
RETURNS TRIGGER AS $$
DECLARE
  target_company_payment_period_id UUID;
  target_driver_user_id UUID;
BEGIN
  -- Determinar valores según el tipo de operación
  IF TG_OP = 'DELETE' THEN
    target_company_payment_period_id := OLD.payment_period_id;
    target_driver_user_id := OLD.driver_user_id;
  ELSE
    target_company_payment_period_id := NEW.payment_period_id;
    target_driver_user_id := NEW.driver_user_id;
  END IF;
  
  -- Solo proceder si hay período de pago y conductor válidos
  IF target_company_payment_period_id IS NOT NULL AND target_driver_user_id IS NOT NULL THEN
    RAISE LOG '🔄 TRIGGER_LOADS_FINAL: % - Recalculando conductor % período %', 
      TG_OP, target_driver_user_id, target_company_payment_period_id;
    
    -- Ejecutar recálculo
    PERFORM auto_recalculate_driver_payment_period_v2(
      target_driver_user_id,
      target_company_payment_period_id
    );
    
    RAISE LOG '✅ TRIGGER_LOADS_FINAL: Recálculo completado para conductor %',
      target_driver_user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. CREAR EL ÚNICO TRIGGER NECESARIO
CREATE TRIGGER trigger_loads_final_recalculation
  AFTER INSERT OR UPDATE OR DELETE ON public.loads
  FOR EACH ROW 
  EXECUTE FUNCTION auto_recalculate_on_loads_final();