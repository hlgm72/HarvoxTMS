-- Enfoque alternativo: Resetear la extensión pg_cron para eliminar políticas problemáticas
-- Primero, obtener todos los trabajos cron existentes para poder recrearlos
CREATE TEMP TABLE temp_cron_jobs AS 
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE active = true;

-- Deshabilitar y volver a habilitar la extensión para resetear políticas
DROP EXTENSION IF EXISTS pg_cron CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Restaurar trabajos cron desde la tabla temporal
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN SELECT * FROM temp_cron_jobs LOOP
        PERFORM cron.schedule(
            job_record.jobname,
            job_record.schedule,
            job_record.command
        );
    END LOOP;
END $$;

-- Limpiar tabla temporal
DROP TABLE IF EXISTS temp_cron_jobs;