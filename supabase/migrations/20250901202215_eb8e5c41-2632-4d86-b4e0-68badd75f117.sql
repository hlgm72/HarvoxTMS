-- Función para limpiar período de semana 35 y datos huérfanos
CREATE OR REPLACE FUNCTION public.cleanup_period_and_orphaned_data(
  target_company_id UUID,
  week_number INTEGER DEFAULT 35,
  year_number INTEGER DEFAULT 2025
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_period_id UUID;
  deleted_calculations INTEGER := 0;
  deleted_expenses INTEGER := 0;
  deleted_periods INTEGER := 0;
  period_info RECORD;
BEGIN
  -- Verificar usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar permisos de administrador en la empresa
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para limpiar datos de esta empresa';
  END IF;

  -- Buscar el período de la semana especificada
  SELECT id, period_start_date, period_end_date, status
  INTO period_info
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND EXTRACT(WEEK FROM period_start_date) = week_number
    AND EXTRACT(YEAR FROM period_start_date) = year_number
  LIMIT 1;

  IF period_info.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se encontró período para la semana ' || week_number || ' del año ' || year_number,
      'company_id', target_company_id
    );
  END IF;

  target_period_id := period_info.id;

  -- Log de inicio de limpieza
  RAISE NOTICE 'Iniciando limpieza del período % (semana %, fechas: % - %)', 
    target_period_id, week_number, period_info.period_start_date, period_info.period_end_date;

  -- 1. ELIMINAR DEDUCCIONES HUÉRFANAS (expense_instances) del período
  DELETE FROM expense_instances
  WHERE payment_period_id IN (
    SELECT id FROM driver_period_calculations
    WHERE company_payment_period_id = target_period_id
  );
  
  GET DIAGNOSTICS deleted_expenses = ROW_COUNT;
  RAISE NOTICE 'Eliminadas % deducciones del período', deleted_expenses;

  -- 2. ELIMINAR CÁLCULOS DE CONDUCTORES del período
  DELETE FROM driver_period_calculations
  WHERE company_payment_period_id = target_period_id;
  
  GET DIAGNOSTICS deleted_calculations = ROW_COUNT;
  RAISE NOTICE 'Eliminados % cálculos de conductores', deleted_calculations;

  -- 3. ELIMINAR EL PERÍODO MISMO
  DELETE FROM company_payment_periods
  WHERE id = target_period_id;
  
  GET DIAGNOSTICS deleted_periods = ROW_COUNT;
  RAISE NOTICE 'Eliminados % períodos de pago', deleted_periods;

  -- Verificar que no haya cargas huérfanas apuntando al período eliminado
  UPDATE loads
  SET payment_period_id = NULL
  WHERE payment_period_id = target_period_id;

  -- Log de registro de limpieza
  INSERT INTO archive_logs (
    operation_type,
    table_name,
    details,
    triggered_by,
    records_affected,
    status
  ) VALUES (
    'CLEANUP_PERIOD',
    'company_payment_periods',
    jsonb_build_object(
      'period_id', target_period_id,
      'week_number', week_number,
      'year', year_number,
      'company_id', target_company_id,
      'deleted_calculations', deleted_calculations,
      'deleted_expenses', deleted_expenses,
      'deleted_periods', deleted_periods,
      'period_dates', jsonb_build_object(
        'start', period_info.period_start_date,
        'end', period_info.period_end_date
      )
    ),
    current_user_id,
    deleted_calculations + deleted_expenses + deleted_periods,
    'completed'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Limpieza completada exitosamente',
    'period_id', target_period_id,
    'week_number', week_number,
    'year', year_number,
    'company_id', target_company_id,
    'deleted_calculations', deleted_calculations,
    'deleted_expenses', deleted_expenses,
    'deleted_periods', deleted_periods,
    'period_dates', jsonb_build_object(
      'start_date', period_info.period_start_date,
      'end_date', period_info.period_end_date
    ),
    'cleaned_by', current_user_id,
    'cleaned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en limpieza de período: %', SQLERRM;
END;
$function$;