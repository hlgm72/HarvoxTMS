-- 🚨 SOLUCIÓN DEFINITIVA: Eliminar triggers automáticos que crean períodos innecesarios
-- Los períodos SOLO se deben crear cuando hay transacciones reales desde el frontend

-- DESHABILITAR triggers automáticos que crean períodos sin transacciones reales
DROP TRIGGER IF EXISTS trigger_assign_payment_period ON loads;
DROP TRIGGER IF EXISTS trigger_assign_payment_period_on_date_change ON loads; 
DROP TRIGGER IF EXISTS trigger_update_payment_period ON loads;
DROP TRIGGER IF EXISTS trigger_update_payment_period_on_load_update ON loads;

-- Verificar triggers restantes
SELECT 
  trigger_name,
  event_manipulation,
  'Trigger restante en loads' as status
FROM information_schema.triggers 
WHERE event_object_table = 'loads' 
AND event_object_schema = 'public'
ORDER BY trigger_name;