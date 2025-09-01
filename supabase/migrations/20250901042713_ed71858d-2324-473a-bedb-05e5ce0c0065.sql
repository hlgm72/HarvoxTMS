-- 🚨 SOLUCIÓN DEFINITIVA: Eliminar triggers automáticos que crean períodos innecesarios
-- Los períodos SOLO se deben crear cuando hay transacciones reales desde el frontend

-- 1. Ver qué hacen los triggers problemáticos
SELECT 'TRIGGER: ' || trigger_name || ' - FUNCTION: ' || action_statement as info
FROM information_schema.triggers 
WHERE event_object_table = 'loads' 
AND trigger_name LIKE '%payment_period%';

-- 2. DESHABILITAR triggers automáticos que crean períodos sin transacciones reales
DROP TRIGGER IF EXISTS trigger_assign_payment_period ON loads;
DROP TRIGGER IF EXISTS trigger_assign_payment_period_on_date_change ON loads;
DROP TRIGGER IF EXISTS trigger_update_payment_period ON loads;
DROP TRIGGER IF EXISTS trigger_update_payment_period_on_load_update ON loads;

-- 3. Comentar las funciones obsoletas
COMMENT ON FUNCTION public.assign_payment_period_to_load IS 
'FUNCIÓN OBSOLETA - Los períodos se crean bajo demanda desde el frontend, no automáticamente';

COMMENT ON FUNCTION public.assign_payment_period_on_date_change IS 
'FUNCIÓN OBSOLETA - Los períodos se crean bajo demanda desde el frontend, no automáticamente';

COMMENT ON FUNCTION public.update_payment_period_on_date_change IS 
'FUNCIÓN OBSOLETA - Los períodos se crean bajo demanda desde el frontend, no automáticamente';

-- 4. Verificar que solo quedan triggers de recálculo (sin creación de períodos)
SELECT 
  'TRIGGERS RESTANTES EN LOADS: ' || trigger_name || ' -> ' || action_statement as remaining_triggers
FROM information_schema.triggers 
WHERE event_object_table = 'loads' 
AND event_object_schema = 'public'
ORDER BY trigger_name;