-- 🚨 SISTEMA DE LIMPIEZA AUTOMÁTICA DE PERÍODOS VACÍOS (CORREGIDO)
-- Eliminar períodos que quedan sin transacciones reales

-- 1. FUNCIÓN PARA DETECTAR SI UN PERÍODO ESTÁ VACÍO
CREATE OR REPLACE FUNCTION public.is_payment_period_empty(period_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  has_loads BOOLEAN := FALSE;
  has_fuel BOOLEAN := FALSE;
  has_expenses BOOLEAN := FALSE;
  is_locked BOOLEAN := FALSE;
BEGIN
  -- Verificar si el período está bloqueado
  SELECT COALESCE(is_locked, false) INTO is_locked
  FROM company_payment_periods
  WHERE id = period_id;
  
  -- No eliminar períodos bloqueados
  IF is_locked THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar cargas
  SELECT EXISTS(
    SELECT 1 FROM loads 
    WHERE payment_period_id = period_id
  ) INTO has_loads;
  
  -- Verificar combustible  
  SELECT EXISTS(
    SELECT 1 FROM fuel_expenses 
    WHERE payment_period_id = period_id
  ) INTO has_fuel;
  
  -- Verificar deducciones/ingresos (via driver_period_calculations)
  SELECT EXISTS(
    SELECT 1 FROM expense_instances ei
    JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
    WHERE dpc.company_payment_period_id = period_id
  ) INTO has_expenses;
  
  -- El período está vacío si no tiene ningún tipo de transacción
  RETURN NOT (has_loads OR has_fuel OR has_expenses);
END;
$function$;

-- 2. FUNCIÓN PARA LIMPIAR PERÍODO VACÍO AUTOMÁTICAMENTE (CORREGIDA)
CREATE OR REPLACE FUNCTION public.cleanup_empty_payment_period(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  period_info RECORD;
  calculations_deleted INTEGER := 0;
  periods_deleted INTEGER := 0;
BEGIN
  -- Obtener información del período
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
  DELETE FROM driver_period_calculations
  WHERE company_payment_period_id = period_id;
  
  GET DIAGNOSTICS calculations_deleted = ROW_COUNT;
  
  -- 2. Eliminar el período mismo
  DELETE FROM company_payment_periods
  WHERE id = period_id;
  
  GET DIAGNOSTICS periods_deleted = ROW_COUNT;
  
  RAISE LOG 'Período vacío eliminado: %, cálculos eliminados: %, períodos eliminados: %', 
    period_id, calculations_deleted, periods_deleted;
  
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
    'periods_deleted', periods_deleted,
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

-- 3. FUNCIÓN PARA LIMPIAR AUTOMÁTICAMENTE DESPUÉS DE ELIMINAR TRANSACCIONES
CREATE OR REPLACE FUNCTION public.auto_cleanup_empty_periods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  target_period_id UUID;
  cleanup_result JSONB;
BEGIN
  -- Determinar el período afectado según el tipo de eliminación
  IF TG_TABLE_NAME = 'loads' THEN
    target_period_id := OLD.payment_period_id;
  ELSIF TG_TABLE_NAME = 'fuel_expenses' THEN
    target_period_id := OLD.payment_period_id;
  ELSIF TG_TABLE_NAME = 'expense_instances' THEN
    -- Para expense_instances, obtener el período vía driver_period_calculations
    SELECT dpc.company_payment_period_id INTO target_period_id
    FROM driver_period_calculations dpc
    WHERE dpc.id = OLD.payment_period_id;
  END IF;
  
  -- Solo procesar si hay un período válido
  IF target_period_id IS NOT NULL THEN
    -- Intentar limpiar el período si quedó vacío
    SELECT cleanup_empty_payment_period(target_period_id) INTO cleanup_result;
    
    RAISE LOG 'Auto-cleanup después de eliminar %: %', TG_TABLE_NAME, cleanup_result;
  END IF;
  
  RETURN OLD;
END;
$function$;

-- 4. CREAR TRIGGERS PARA LIMPIEZA AUTOMÁTICA
DROP TRIGGER IF EXISTS auto_cleanup_after_load_delete ON loads;
CREATE TRIGGER auto_cleanup_after_load_delete
  AFTER DELETE ON loads
  FOR EACH ROW
  WHEN (OLD.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION auto_cleanup_empty_periods();

DROP TRIGGER IF EXISTS auto_cleanup_after_fuel_delete ON fuel_expenses;
CREATE TRIGGER auto_cleanup_after_fuel_delete
  AFTER DELETE ON fuel_expenses
  FOR EACH ROW
  WHEN (OLD.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION auto_cleanup_empty_periods();

DROP TRIGGER IF EXISTS auto_cleanup_after_expense_delete ON expense_instances;
CREATE TRIGGER auto_cleanup_after_expense_delete
  AFTER DELETE ON expense_instances
  FOR EACH ROW
  WHEN (OLD.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION auto_cleanup_empty_periods();

-- 5. FUNCIÓN MANUAL PARA LIMPIAR TODOS LOS PERÍODOS VACÍOS DE UNA EMPRESA
CREATE OR REPLACE FUNCTION public.cleanup_all_empty_periods_for_company(target_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id UUID;
  period_record RECORD;
  cleanup_result JSONB;
  results JSONB[] := '{}';
  total_cleaned INTEGER := 0;
BEGIN
  -- Verificar usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para limpiar períodos de esta empresa';
  END IF;

  -- Buscar todos los períodos vacíos de la empresa
  FOR period_record IN 
    SELECT id, period_start_date, period_end_date
    FROM company_payment_periods
    WHERE company_id = target_company_id
      AND status = 'open'
      AND NOT COALESCE(is_locked, false)
    ORDER BY period_start_date
  LOOP
    -- Intentar limpiar cada período
    SELECT cleanup_empty_payment_period(period_record.id) INTO cleanup_result;
    
    IF (cleanup_result->>'success')::BOOLEAN THEN
      total_cleaned := total_cleaned + 1;
    END IF;
    
    results := results || cleanup_result;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Limpieza completada',
    'company_id', target_company_id,
    'total_periods_cleaned', total_cleaned,
    'results', array_to_json(results)::jsonb,
    'cleaned_by', current_user_id,
    'cleaned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en limpieza masiva: %', SQLERRM;
END;
$function$;