-- Ejemplo de estrategia de archiving (preparación futura)

-- Crear tabla de archivo para datos históricos
CREATE TABLE IF NOT EXISTS public.loads_archive (
    LIKE public.loads INCLUDING ALL
);

-- Función para mover datos antiguos automáticamente
CREATE OR REPLACE FUNCTION move_to_archive()
RETURNS TABLE(moved_records INTEGER) AS $$
DECLARE
    moved_count INTEGER;
BEGIN
    -- Mover cargas completadas > 2 años a archivo
    WITH moved_loads AS (
        DELETE FROM public.loads 
        WHERE status = 'completed' 
        AND created_at < NOW() - INTERVAL '2 years'
        RETURNING *
    )
    INSERT INTO public.loads_archive 
    SELECT * FROM moved_loads;
    
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    
    RETURN QUERY SELECT moved_count;
END;
$$ LANGUAGE plpgsql;

-- Crear vista unificada para consultas históricas completas
CREATE OR REPLACE VIEW public.loads_complete AS
SELECT *, 'active' as data_source FROM public.loads
UNION ALL
SELECT *, 'archived' as data_source FROM public.loads_archive;