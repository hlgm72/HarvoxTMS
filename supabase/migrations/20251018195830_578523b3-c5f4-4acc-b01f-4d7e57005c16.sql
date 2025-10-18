-- ====================================================================
-- 🔧 CORRECCIÓN: Eliminar referencias a campos inexistentes en cleanup
-- ====================================================================
-- 
-- PROBLEMA: cleanup_empty_payment_period intenta acceder a is_locked y status
--           pero estos campos no existen en company_payment_periods
-- SOLUCIÓN: Eliminar referencias a estos campos y simplificar la lógica
-- ====================================================================

-- 1. FUNCIÓN PARA DETECTAR SI UN PERÍODO ESTÁ VACÍO (sin is_locked check)
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
BEGIN
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
  
  -- Verificar deducciones/ingresos (via user_payrolls)
  SELECT EXISTS(
    SELECT 1 FROM expense_instances ei
    WHERE ei.payment_period_id IN (
      SELECT id FROM user_payrolls WHERE company_payment_period_id = period_id
    )
  ) INTO has_expenses;
  
  -- El período está vacío si no tiene ningún tipo de transacción
  RETURN NOT (has_loads OR has_fuel OR has_expenses);
END;
$function$;

-- 2. FUNCIÓN PARA LIMPIAR PERÍODO VACÍO (sin referencias a is_locked/status)
CREATE OR REPLACE FUNCTION public.cleanup_empty_payment_period(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  period_info RECORD;
  calculations_deleted INTEGER := 0;
BEGIN
  -- Obtener información del período (sin is_locked/status)
  SELECT 
    cpp.id,
    cpp.company_id,
    cpp.period_start_date,
    cpp.period_end_date
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
  
  RAISE LOG 'Limpiando período vacío: % (fechas: % - %)', 
    period_id, period_info.period_start_date, period_info.period_end_date;
  
  -- 1. Eliminar cálculos de conductores huérfanos
  DELETE FROM user_payrolls
  WHERE company_payment_period_id = period_id;
  
  GET DIAGNOSTICS calculations_deleted = ROW_COUNT;
  
  -- 2. Eliminar el período mismo
  DELETE FROM company_payment_periods
  WHERE id = period_id;
  
  RAISE LOG 'Período vacío eliminado: %, cálculos eliminados: %', 
    period_id, calculations_deleted;
  
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

-- 3. FUNCIÓN PARA LIMPIAR AUTOMÁTICAMENTE (corregir tabla de cálculos)
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
    -- Para expense_instances, obtener el período vía user_payrolls
    SELECT up.company_payment_period_id INTO target_period_id
    FROM user_payrolls up
    WHERE up.id = OLD.payment_period_id;
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

-- 4. FUNCIÓN MANUAL (sin referencias a is_locked/status)
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

  -- Buscar todos los períodos de la empresa
  FOR period_record IN 
    SELECT id, period_start_date, period_end_date
    FROM company_payment_periods
    WHERE company_id = target_company_id
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

COMMENT ON FUNCTION cleanup_empty_payment_period IS 'FIXED: Removed references to non-existent is_locked and status fields. Now uses user_payrolls instead of driver_period_calculations.';