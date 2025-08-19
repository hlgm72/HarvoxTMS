-- Resetear la carga 25-386 completamente
-- 1. Actualizar el estado de la carga a 'assigned'
UPDATE loads 
SET status = 'assigned',
    updated_at = now()
WHERE load_number = '25-386';

-- 2. Limpiar el historial de estados (mantener solo el estado inicial 'assigned')
DELETE FROM load_status_history 
WHERE load_id = 'bbc28240-67a8-436d-b358-30d3e462d245'
AND new_status != 'assigned';

-- 3. Actualizar el registro de assigned para marcarlo como el estado actual
UPDATE load_status_history 
SET changed_at = now(),
    changed_by = '087a825c-94ea-42d9-8388-5087a19d776f',
    notes = 'Carga reseteada completamente - progreso 0%',
    eta_provided = null,
    stop_id = null
WHERE load_id = 'bbc28240-67a8-436d-b358-30d3e462d245'
AND new_status = 'assigned';

-- 4. Resetear las ETAs de las paradas
UPDATE load_stops 
SET eta_date = null,
    eta_time = null,
    last_status_update = null,
    updated_at = now()
WHERE load_id = 'bbc28240-67a8-436d-b358-30d3e462d245';