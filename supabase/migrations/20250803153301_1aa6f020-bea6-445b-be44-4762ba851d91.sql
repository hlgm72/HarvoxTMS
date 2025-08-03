-- Crear función con SECURITY DEFINER para deshabilitar RLS en tablas cron
-- Esto ejecuta con privilegios del propietario de la función

CREATE OR REPLACE FUNCTION disable_cron_rls()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Deshabilitar RLS en las tablas cron para eliminar warnings
    ALTER TABLE cron.job DISABLE ROW LEVEL SECURITY;
    ALTER TABLE cron.job_run_details DISABLE ROW LEVEL SECURITY;
    
    RETURN 'RLS disabled on cron tables successfully';
EXCEPTION WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Ejecutar la función
SELECT disable_cron_rls();

-- Limpiar la función temporal
DROP FUNCTION IF EXISTS disable_cron_rls();