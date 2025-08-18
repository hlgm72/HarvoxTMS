-- Resetear el estado de la carga 25-384
UPDATE loads 
SET status = 'assigned',
    updated_at = now()
WHERE load_number = '25-384';

-- Limpiar fechas y notas en load_stops relacionado
UPDATE load_stops 
SET actual_date = null,
    actual_time = null,
    driver_notes = null,
    estimated_arrival_time = null,
    status_updated_at = null,
    status_updated_by = null,
    updated_at = now()
WHERE load_id IN (
    SELECT id FROM loads WHERE load_number = '25-384'
);