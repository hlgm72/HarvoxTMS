-- Sistema de notificaciones para archiving automático

-- 1. Tabla para logs de archiving
CREATE TABLE IF NOT EXISTS public.archive_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type text NOT NULL, -- 'archive', 'partition', 'cleanup'
    table_name text NOT NULL,
    records_affected integer DEFAULT 0,
    status text DEFAULT 'started', -- 'started', 'completed', 'failed'
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    error_message text,
    triggered_by text, -- 'manual', 'scheduled', 'threshold'
    details jsonb
);

-- Enable RLS
ALTER TABLE public.archive_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for archive logs
CREATE POLICY "Company admins can view archive logs" ON public.archive_logs
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_company_roles ucr 
        WHERE ucr.user_id = auth.uid() 
        AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND ucr.is_active = true
    )
);

-- 2. Función mejorada con logging y notificaciones
CREATE OR REPLACE FUNCTION move_to_archive_with_logging()
RETURNS jsonb AS $$
DECLARE
    moved_count INTEGER;
    log_id uuid;
    result jsonb;
BEGIN
    -- Crear log de inicio
    INSERT INTO public.archive_logs (operation_type, table_name, triggered_by, status)
    VALUES ('archive', 'loads', 'manual', 'started')
    RETURNING id INTO log_id;
    
    -- Realizar el archiving
    WITH moved_loads AS (
        DELETE FROM public.loads 
        WHERE status = 'completed' 
        AND created_at < NOW() - INTERVAL '2 years'
        RETURNING *
    )
    INSERT INTO public.loads_archive 
    SELECT * FROM moved_loads;
    
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    
    -- Actualizar log con resultados
    UPDATE public.archive_logs 
    SET 
        records_affected = moved_count,
        status = 'completed',
        completed_at = now(),
        details = jsonb_build_object(
            'threshold_date', (NOW() - INTERVAL '2 years')::date,
            'execution_time_ms', EXTRACT(epoch FROM (now() - started_at)) * 1000
        )
    WHERE id = log_id;
    
    -- Preparar respuesta
    result := jsonb_build_object(
        'success', true,
        'records_moved', moved_count,
        'log_id', log_id,
        'message', CASE 
            WHEN moved_count > 0 THEN format('Successfully archived %s old loads', moved_count)
            ELSE 'No old loads found to archive'
        END
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    -- Log del error
    UPDATE public.archive_logs 
    SET 
        status = 'failed',
        completed_at = now(),
        error_message = SQLERRM
    WHERE id = log_id;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'log_id', log_id
    );
END;
$$ LANGUAGE plpgsql;