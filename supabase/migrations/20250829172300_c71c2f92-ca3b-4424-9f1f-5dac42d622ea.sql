-- Eliminar períodos más allá de la próxima semana
-- Mantener solo período actual y tal vez el siguiente inmediato

-- Primero, ver qué períodos tenemos actualmente
DO $$
DECLARE
    current_week_start DATE;
    next_week_start DATE;
    periods_to_delete INTEGER;
BEGIN
    -- Calcular inicio de semana actual (lunes)
    current_week_start := DATE_TRUNC('week', CURRENT_DATE);
    -- Siguiente semana
    next_week_start := current_week_start + INTERVAL '7 days';
    
    -- Contar períodos que se van a eliminar
    SELECT COUNT(*) INTO periods_to_delete 
    FROM company_payment_periods 
    WHERE period_start_date >= next_week_start + INTERVAL '7 days';
    
    RAISE NOTICE 'Eliminando % períodos posteriores a %', periods_to_delete, next_week_start + INTERVAL '7 days';
END $$;

-- Eliminar períodos que empiecen más de una semana en el futuro
DELETE FROM company_payment_periods 
WHERE period_start_date >= DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '14 days';

-- Limpiar calculations huérfanos
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id NOT IN (
  SELECT id FROM company_payment_periods
);