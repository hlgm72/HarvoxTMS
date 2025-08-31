-- ARREGLAR EL BUG: Corregir las cargas inconsistentes
-- Si tienen conductor asignado, su status debe ser "assigned", no "created"

UPDATE loads 
SET 
  status = 'assigned',
  updated_at = now()
WHERE driver_user_id IS NOT NULL 
AND status = 'created';

-- Verificar cuántas cargas se corrigieron
SELECT 
  'CARGAS CORREGIDAS' as resultado,
  COUNT(*) as cantidad
FROM loads 
WHERE driver_user_id IS NOT NULL 
AND status = 'assigned'
AND updated_at > now() - INTERVAL '1 minute';