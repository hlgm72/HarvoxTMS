-- Eliminar warning de seguridad para tabla cron.job
-- Excluir usuarios anónimos del acceso a trabajos de cron

-- Actualizar política para cron.job para excluir usuarios anónimos
DROP POLICY IF EXISTS "cron_job_policy" ON cron.job;
CREATE POLICY "cron_job_policy" ON cron.job
AS RESTRICTIVE
TO authenticated
USING ((SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);

-- Actualizar política para cron.job_run_details para excluir usuarios anónimos  
DROP POLICY IF EXISTS "cron_job_run_details_policy" ON cron.job_run_details;
CREATE POLICY "cron_job_run_details_policy" ON cron.job_run_details
AS RESTRICTIVE  
TO authenticated
USING ((SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);