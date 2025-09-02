-- ===============================================
-- 🚨 SISTEMA DE LIMPIEZA AUTOMÁTICA DE PERÍODOS VACÍOS
-- ===============================================
-- Este sistema elimina automáticamente períodos de pago que se quedan sin datos

-- Función para verificar si un período de pago tiene datos asociados
CREATE OR REPLACE FUNCTION public.check_and_cleanup_empty_periods(target_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_record RECORD;
  has_loads BOOLEAN := false;
  has_fuel_expenses BOOLEAN := false;
  has_deductions BOOLEAN := false;
  has_other_income BOOLEAN := false;
  deleted_calculations INTEGER := 0;
  deleted_periods INTEGER := 0;
BEGIN
  -- Obtener información del período
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;

  -- Verificar si el período está bloqueado (no eliminar si está locked)
  IF period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período bloqueado, no se puede eliminar');
  END IF;

  -- Verificar si hay cargas asociadas al período
  SELECT EXISTS (
    SELECT 1 FROM loads 
    WHERE payment_period_id = target_period_id
  ) INTO has_loads;

  -- Verificar si hay gastos de combustible asociados al período (a través de driver_period_calculations)
  SELECT EXISTS (
    SELECT 1 FROM fuel_expenses fe
    JOIN driver_period_calculations dpc ON fe.payment_period_id = dpc.id
    WHERE dpc.company_payment_period_id = target_period_id
  ) INTO has_fuel_expenses;

  -- Verificar si hay deducciones asociadas al período (a través de driver_period_calculations)
  SELECT EXISTS (
    SELECT 1 FROM expense_instances ei
    JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
    WHERE dpc.company_payment_period_id = target_period_id
  ) INTO has_deductions;

  -- Verificar si hay otros ingresos asociados al período (si existe la tabla)
  SELECT EXISTS (
    SELECT 1 FROM other_income oi
    JOIN driver_period_calculations dpc ON oi.payment_period_id = dpc.id
    WHERE dpc.company_payment_period_id = target_period_id
  ) INTO has_other_income;

  -- Si no hay datos asociados, eliminar el período
  IF NOT (has_loads OR has_fuel_expenses OR has_deductions OR has_other_income) THEN
    
    RAISE NOTICE '🧹 Eliminando período vacío: % (fechas: % - %)', 
      target_period_id, period_record.period_start_date, period_record.period_end_date;

    -- Primero eliminar los cálculos de conductores
    DELETE FROM driver_period_calculations
    WHERE company_payment_period_id = target_period_id;
    
    GET DIAGNOSTICS deleted_calculations = ROW_COUNT;

    -- Luego eliminar el período de pago
    DELETE FROM company_payment_periods
    WHERE id = target_period_id;
    
    GET DIAGNOSTICS deleted_periods = ROW_COUNT;

    -- Log de la operación
    INSERT INTO archive_logs (
      operation_type,
      table_name,
      details,
      triggered_by,
      records_affected,
      status
    ) VALUES (
      'AUTO_CLEANUP_EMPTY_PERIOD',
      'company_payment_periods',
      jsonb_build_object(
        'period_id', target_period_id,
        'company_id', period_record.company_id,
        'period_dates', jsonb_build_object(
          'start', period_record.period_start_date,
          'end', period_record.period_end_date
        ),
        'deleted_calculations', deleted_calculations,
        'reason', 'period_became_empty'
      ),
      'system',
      deleted_calculations + deleted_periods,
      'completed'
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deleted',
      'message', 'Período vacío eliminado automáticamente',
      'deleted_calculations', deleted_calculations,
      'deleted_periods', deleted_periods,
      'period_dates', jsonb_build_object(
        'start', period_record.period_start_date,
        'end', period_record.period_end_date
      )
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'action', 'kept',
      'message', 'Período tiene datos, se mantiene',
      'has_loads', has_loads,
      'has_fuel_expenses', has_fuel_expenses,
      'has_deductions', has_deductions,
      'has_other_income', has_other_income
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en limpieza automática: %', SQLERRM;
END;
$$;

-- Función trigger para verificar períodos después de eliminar datos
CREATE OR REPLACE FUNCTION public.trigger_check_empty_period_after_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_id_to_check uuid;
BEGIN
  -- Determinar qué período verificar según la tabla
  IF TG_TABLE_NAME = 'loads' THEN
    period_id_to_check := OLD.payment_period_id;
  ELSIF TG_TABLE_NAME = 'fuel_expenses' THEN
    -- Obtener el período de pago de la tabla driver_period_calculations
    SELECT dpc.company_payment_period_id INTO period_id_to_check
    FROM driver_period_calculations dpc
    WHERE dpc.id = OLD.payment_period_id;
  ELSIF TG_TABLE_NAME = 'expense_instances' THEN
    -- Obtener el período de pago de la tabla driver_period_calculations
    SELECT dpc.company_payment_period_id INTO period_id_to_check
    FROM driver_period_calculations dpc
    WHERE dpc.id = OLD.payment_period_id;
  ELSIF TG_TABLE_NAME = 'other_income' THEN
    -- Obtener el período de pago de la tabla driver_period_calculations
    SELECT dpc.company_payment_period_id INTO period_id_to_check
    FROM driver_period_calculations dpc
    WHERE dpc.id = OLD.payment_period_id;
  END IF;

  -- Solo verificar si encontramos un período válido
  IF period_id_to_check IS NOT NULL THEN
    PERFORM check_and_cleanup_empty_periods(period_id_to_check);
  END IF;

  RETURN OLD;
END;
$$;

-- Crear triggers para todas las tablas que pueden dejar períodos vacíos

-- Trigger para loads
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_load_delete ON loads;
CREATE TRIGGER trigger_cleanup_empty_period_after_load_delete
  AFTER DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_empty_period_after_delete();

-- Trigger para fuel_expenses
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_fuel_delete ON fuel_expenses;
CREATE TRIGGER trigger_cleanup_empty_period_after_fuel_delete
  AFTER DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_empty_period_after_delete();

-- Trigger para expense_instances
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_deduction_delete ON expense_instances;
CREATE TRIGGER trigger_cleanup_empty_period_after_deduction_delete
  AFTER DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_empty_period_after_delete();

-- Trigger para other_income (si existe la tabla)
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_income_delete ON other_income;
CREATE TRIGGER trigger_cleanup_empty_period_after_income_delete
  AFTER DELETE ON other_income
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_empty_period_after_delete();

-- Función auxiliar para limpieza manual por si acaso (opcional)
CREATE OR REPLACE FUNCTION public.cleanup_all_empty_periods(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_record RECORD;
  cleanup_result jsonb;
  total_cleaned INTEGER := 0;
BEGIN
  -- Verificar permisos del usuario
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para limpiar períodos de esta empresa';
  END IF;

  -- Revisar todos los períodos de la empresa
  FOR period_record IN 
    SELECT id FROM company_payment_periods 
    WHERE company_id = target_company_id 
    AND is_locked = false
  LOOP
    cleanup_result := check_and_cleanup_empty_periods(period_record.id);
    
    IF (cleanup_result->>'action') = 'deleted' THEN
      total_cleaned := total_cleaned + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', target_company_id,
    'periods_cleaned', total_cleaned,
    'message', 'Limpieza automática de períodos vacíos completada'
  );
END;
$$;