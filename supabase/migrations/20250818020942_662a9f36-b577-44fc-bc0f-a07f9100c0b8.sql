-- Buscar y resetear el estado de la carga 25-384
UPDATE loads 
SET status = 'assigned',
    updated_at = now()
WHERE load_number = '25-384';

-- También resetear cualquier estado en load_stops relacionado
UPDATE load_stops 
SET status = null,
    actual_arrival_date = null,
    actual_departure_date = null,
    notes = null,
    updated_at = now()
WHERE load_id IN (
    SELECT id FROM loads WHERE load_number = '25-384'
);