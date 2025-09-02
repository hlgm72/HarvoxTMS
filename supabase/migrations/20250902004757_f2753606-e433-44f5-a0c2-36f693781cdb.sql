-- 🚨 CORRECCIÓN CRÍTICA: Arreglar error de sintaxis y ambigüedad
-- Corregir GET DIAGNOSTICS y eliminar ambigüedad de is_locked

-- Corregir la función cleanup_empty_payment_period con sintaxis correcta
CREATE OR REPLACE FUNCTION public.cleanup_empty_payment_period(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  period_info RECORD;
  calculations_deleted INTEGER := 0;
  period_deleted INTEGER := 0;
BEGIN
  -- Obtener información del período con alias claros
  SELECT 
    cpp.id,
    cpp.company_id,
    cpp.period_start_date,
    cpp.period_end_date,
    cpp.status,
    cpp.is_locked
  INTO period_info
  FROM company_payment_periods cpp
  WHERE cpp.id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período no encontrado'
    );
  END IF;
  
  -- Verificar si está vacío
  IF NOT is_payment_period_empty(period_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El período no está vacío - contiene transacciones',
      'period_id', period_id
    );
  END IF;
  
  -- No eliminar períodos bloqueados o cerrados
  IF period_info.is_locked OR period_info.status IN ('closed', 'paid') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se puede eliminar - período bloqueado o cerrado',
      'period_id', period_id,
      'status', period_info.status,
      'is_locked', period_info.is_locked
    );
  END IF;
  
  RAISE LOG 'Limpiando período vacío: % (fechas: % - %)', 
    period_id, period_info.period_start_date, period_info.period_end_date;
  
  -- 1. Eliminar cálculos de conductores huérfanos
  DELETE FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = period_id;
  
  GET DIAGNOSTICS calculations_deleted = ROW_COUNT;
  
  -- 2. Eliminar el período mismo
  DELETE FROM company_payment_periods cpp
  WHERE cpp.id = period_id;
  
  GET DIAGNOSTICS period_deleted = ROW_COUNT;
  
  RAISE LOG 'Período vacío eliminado: %, cálculos eliminados: %, períodos eliminados: %', 
    period_id, calculations_deleted, period_deleted;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período vacío eliminado exitosamente',
    'period_id', period_id,
    'company_id', period_info.company_id,
    'period_dates', jsonb_build_object(
      'start_date', period_info.period_start_date,
      'end_date', period_info.period_end_date
    ),
    'calculations_deleted', calculations_deleted,
    'periods_deleted', period_deleted,
    'cleaned_at', now()
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error limpiando período vacío %: %', period_id, SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error limpiando período: ' || SQLERRM,
    'period_id', period_id
  );
END;
$function$;