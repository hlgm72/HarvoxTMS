-- Verificar qué políticas existen actualmente en las tablas cron
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'cron' 
AND tablename IN ('job', 'job_run_details');

-- Eliminar específicamente las políticas que permiten acceso anónimo
-- usando el método correcto para esquemas del sistema

-- Para la tabla cron.job
DO $$
BEGIN
    -- Eliminar todas las políticas existentes
    EXECUTE 'DROP POLICY IF EXISTS cron_job_policy ON cron.job';
    -- Intentar eliminar cualquier otra política que pueda existir
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'cron' AND tablename = 'job') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON cron.job';
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    -- Ignorar errores de permisos
    NULL;
END $$;

-- Para la tabla cron.job_run_details
DO $$
BEGIN
    -- Eliminar todas las políticas existentes
    EXECUTE 'DROP POLICY IF EXISTS cron_job_run_details_policy ON cron.job_run_details';
    -- Intentar eliminar cualquier otra política que pueda existir
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'cron' AND tablename = 'job_run_details') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON cron.job_run_details';
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    -- Ignorar errores de permisos
    NULL;
END $$;