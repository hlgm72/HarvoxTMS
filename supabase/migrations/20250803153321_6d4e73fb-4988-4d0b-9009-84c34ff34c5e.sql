-- Última estrategia: Si no usas cron jobs activamente, eliminar la extensión completa
-- Esto eliminará las tablas problemáticas y por tanto los warnings

-- Verificar si hay trabajos cron activos
SELECT COUNT(*) as active_jobs FROM cron.job WHERE active = true;

-- Si no hay trabajos activos, eliminar la extensión
-- (Esto eliminará completamente las tablas cron.job y cron.job_run_details)
DROP EXTENSION IF EXISTS pg_cron CASCADE;

-- Si necesitas cron en el futuro, puedes volver a crear la extensión con:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verificar que las tablas ya no existen
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE schemaname = 'cron';