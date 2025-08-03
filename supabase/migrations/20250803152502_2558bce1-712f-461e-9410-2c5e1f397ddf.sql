-- Solución correcta para eliminar warnings de acceso anónimo en tablas cron
-- Revocar todos los permisos de las tablas cron para todos los roles públicos

-- Revocar permisos en cron.job
REVOKE ALL ON cron.job FROM public;
REVOKE ALL ON cron.job FROM anon;
REVOKE ALL ON cron.job FROM authenticated;

-- Revocar permisos en cron.job_run_details  
REVOKE ALL ON cron.job_run_details FROM public;
REVOKE ALL ON cron.job_run_details FROM anon;
REVOKE ALL ON cron.job_run_details FROM authenticated;

-- Solo el service_role debe tener acceso a estas tablas
-- (el service_role ya tiene acceso por defecto como superusuario)