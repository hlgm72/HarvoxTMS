-- Resetear el estado de la carga 25-384 para testing
UPDATE loads 
SET status = 'assigned',
    updated_at = now()
WHERE load_number = '25-384';