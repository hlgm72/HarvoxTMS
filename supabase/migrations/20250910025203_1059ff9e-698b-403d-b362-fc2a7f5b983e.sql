-- 🚨 SOLUCIÓN DEFINITIVA: Crear el trigger que falta en la tabla loads
-- Este era el problema: no se ejecutaba recálculo al crear/editar cargas

-- Crear trigger para recalcular automáticamente cuando se modifica una carga
CREATE OR REPLACE TRIGGER trigger_auto_recalculate_on_load_changes
  AFTER INSERT OR UPDATE OF driver_user_id, total_amount, payment_period_id, status, dispatching_percentage, factoring_percentage, leasing_percentage
  ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_driver_payment_period_simple();

-- Verificar que el trigger se creó correctamente
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  'loads trigger created' as status
FROM pg_trigger 
WHERE tgname = 'trigger_auto_recalculate_on_load_changes';