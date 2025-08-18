-- Temporalmente deshabilitar el trigger para hacer el reset
DROP TRIGGER IF EXISTS loads_status_change_trigger ON public.loads;

-- Reset carga 25-384 para testing
-- 1. Resetear estado de la carga a 'assigned'
UPDATE loads 
SET status = 'assigned', updated_at = now()
WHERE load_number = '25-384';

-- 2. Limpiar ETAs y tiempos reales de las paradas
UPDATE load_stops 
SET 
  eta_date = NULL,
  eta_time = NULL,
  actual_arrival_datetime = NULL,
  completion_datetime = NULL,
  last_status_update = now(),
  driver_notes = NULL
WHERE load_id IN (
  SELECT id FROM loads WHERE load_number = '25-384'
);

-- 3. Limpiar historial de estados de esta carga
DELETE FROM load_status_history 
WHERE load_id IN (
  SELECT id FROM loads WHERE load_number = '25-384'
);

-- 4. Rehabilitar el trigger
CREATE TRIGGER loads_status_change_trigger
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_load_status_change();