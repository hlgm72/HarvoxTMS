
-- Eliminar el trigger duplicado que causaba conflictos
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_changes ON loads;

-- Verificar que solo tenemos un trigger de recálculo activo
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'loads'::regclass
  AND tgname LIKE '%recalc%'
ORDER BY tgname;
