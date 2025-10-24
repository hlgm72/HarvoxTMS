
-- Restaurar el trigger de recálculo automático en loads
-- Este trigger se eliminó accidentalmente por el CASCADE en la migración anterior

-- Eliminar cualquier trigger residual primero
DROP TRIGGER IF EXISTS trigger_recalc_on_load_change ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads_update ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads_delete ON loads;

-- Crear el trigger correcto que recalcula automáticamente el payroll
CREATE TRIGGER trigger_recalc_on_load_change
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_on_loads_change();
