-- Fix remaining security linter issues
-- Fix 1: Functions with mutable search_path

-- Fix archive_old_loads function
CREATE OR REPLACE FUNCTION public.archive_old_loads()
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Esta función se usará cuando tengas datos históricos
    -- Por ahora solo cuenta cuántas cargas serían archivables
    SELECT COUNT(*) INTO archived_count
    FROM loads 
    WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '2 years';
    
    RETURN archived_count;
END;
$function$;

-- Fix move_to_archive function
CREATE OR REPLACE FUNCTION public.move_to_archive()
RETURNS TABLE(moved_records integer)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    moved_count INTEGER;
BEGIN
    -- Mover cargas completadas > 2 años a archivo
    WITH moved_loads AS (
        DELETE FROM public.loads 
        WHERE status = 'completed' 
        AND created_at < NOW() - INTERVAL '2 years'
        RETURNING *
    )
    INSERT INTO public.loads_archive 
    SELECT * FROM moved_loads;
    
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    
    RETURN QUERY SELECT moved_count;
END;
$function$;

-- Fix move_to_archive_with_logging function
CREATE OR REPLACE FUNCTION public.move_to_archive_with_logging()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;