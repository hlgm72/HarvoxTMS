-- EJEMPLO de cómo sería el particionamiento de loads (NO ejecutar ahora)
-- Este es solo un ejemplo para mostrar la estrategia

-- Paso 1: Crear tabla principal particionada (ejemplo futuro)
/*
CREATE TABLE public.loads_partitioned (
    id uuid DEFAULT gen_random_uuid(),
    load_number text NOT NULL,
    driver_user_id uuid,
    pickup_date date,
    delivery_date date,
    status text DEFAULT 'pending',
    total_amount numeric DEFAULT 0,
    payment_period_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    -- otros campos...
    
    PRIMARY KEY (id, created_at)  -- La clave de partición DEBE estar en PK
) PARTITION BY RANGE (created_at);

-- Paso 2: Crear particiones por trimestre
CREATE TABLE public.loads_2024_q1 PARTITION OF public.loads_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE public.loads_2024_q2 PARTITION OF public.loads_partitioned
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE public.loads_2024_q3 PARTITION OF public.loads_partitioned
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

-- Paso 3: Partición para datos actuales (siempre la más activa)
CREATE TABLE public.loads_current PARTITION OF public.loads_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Paso 4: Crear índices en cada partición
CREATE INDEX idx_loads_2024_q1_driver ON public.loads_2024_q1(driver_user_id);
CREATE INDEX idx_loads_current_driver ON public.loads_current(driver_user_id);
*/

-- Por ahora, creamos una función para automatizar archiving cuando sea necesario
CREATE OR REPLACE FUNCTION archive_old_loads()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Esta función se usará cuando tengas datos históricos
    -- Por ahora solo cuenta cuántas cargas serían archivables
    SELECT COUNT(*) INTO archived_count
    FROM loads 
    WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '2 years';
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;