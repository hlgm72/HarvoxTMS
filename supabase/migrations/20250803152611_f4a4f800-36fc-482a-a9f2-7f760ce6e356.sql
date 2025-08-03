-- Eliminar las políticas RLS específicas que causan los warnings de acceso anónimo
-- Estas políticas permiten acceso anónimo a las tablas cron

-- Eliminar la política cron_job_policy de la tabla cron.job
DROP POLICY IF EXISTS cron_job_policy ON cron.job;

-- Eliminar la política cron_job_run_details_policy de la tabla cron.job_run_details
DROP POLICY IF EXISTS cron_job_run_details_policy ON cron.job_run_details;

-- Opcional: También podemos deshabilitar RLS completamente en estas tablas
-- ya que son tablas del sistema que solo deberían ser accesibles por service_role
ALTER TABLE cron.job DISABLE ROW LEVEL SECURITY;
ALTER TABLE cron.job_run_details DISABLE ROW LEVEL SECURITY;