-- SOLUCIÓN DEFINITIVA: Recrear el trigger correctamente
-- El problema: el trigger anterior no se registró

-- Verificar y eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_changes ON loads;

-- Crear el trigger correctamente
CREATE TRIGGER trigger_auto_recalculate_on_load_changes
  AFTER INSERT OR UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_driver_payment_period_simple();

-- Verificar que se creó correctamente
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  'SUCCESS: Trigger created on loads table' as status
FROM pg_trigger 
WHERE tgname = 'trigger_auto_recalculate_on_load_changes' AND tgrelid = 'loads'::regclass;