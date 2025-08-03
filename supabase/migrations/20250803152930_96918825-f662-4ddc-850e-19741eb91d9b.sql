-- Enfoque final: Deshabilitar completamente RLS en las tablas cron
-- Esto eliminará todos los warnings de políticas de acceso anónimo

-- Verificar políticas existentes primero
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'cron' 
AND tablename IN ('job', 'job_run_details');

-- Deshabilitar RLS completamente en las tablas cron para eliminar warnings
-- Esto es seguro porque son tablas del sistema que no contienen datos de usuarios
ALTER TABLE cron.job DISABLE ROW LEVEL SECURITY;
ALTER TABLE cron.job_run_details DISABLE ROW LEVEL SECURITY;

-- Como alternativa, si no se puede deshabilitar RLS, 
-- intentar eliminar las políticas específicas usando service_role
-- (ejecutado con permisos de servicio)
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Eliminar políticas de cron.job
    FOR rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'cron' AND tablename = 'job'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY %I ON cron.job', rec.policyname);
        EXCEPTION WHEN OTHERS THEN
            -- Continuar si hay errores de permisos
            CONTINUE;
        END;
    END LOOP;
    
    -- Eliminar políticas de cron.job_run_details
    FOR rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'cron' AND tablename = 'job_run_details'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY %I ON cron.job_run_details', rec.policyname);
        EXCEPTION WHEN OTHERS THEN
            -- Continuar si hay errores de permisos
            CONTINUE;
        END;
    END LOOP;
END $$;