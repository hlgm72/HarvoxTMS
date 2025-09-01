-- RECREAR EL TRIGGER QUE SE PERDIÓ
-- Este trigger es CRÍTICO para que las deducciones por porcentaje funcionen automáticamente

-- Primero eliminar el trigger si existe
DROP TRIGGER IF EXISTS trigger_auto_generate_percentage_deductions ON loads;

-- Crear el trigger que conecta la función con las inserciones en loads
CREATE TRIGGER trigger_auto_generate_percentage_deductions
    AFTER INSERT ON loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_percentage_deductions();

-- Verificar que el trigger se creó correctamente
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_generate_percentage_deductions';