-- Usar el rol postgres para eliminar las políticas problemáticas
-- Conectar como superusuario para modificar tablas del esquema cron

SET ROLE postgres;

-- Eliminar políticas específicas que causan warnings de acceso anónimo
DROP POLICY IF EXISTS cron_job_policy ON cron.job;
DROP POLICY IF EXISTS cron_job_run_details_policy ON cron.job_run_details;

-- Crear políticas más restrictivas que no permitan acceso anónimo
-- Solo permitir acceso al service_role y postgres
CREATE POLICY cron_job_policy ON cron.job
    FOR ALL TO service_role, postgres
    USING (true);

CREATE POLICY cron_job_run_details_policy ON cron.job_run_details  
    FOR ALL TO service_role, postgres
    USING (true);

-- Restablecer rol
RESET ROLE;