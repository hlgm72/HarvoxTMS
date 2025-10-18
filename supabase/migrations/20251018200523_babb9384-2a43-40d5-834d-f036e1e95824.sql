-- ====================================================================
-- 🔧 CORRECCIÓN FINAL: Actualizar TODAS las funciones de cleanup
-- ====================================================================
-- 
-- PROBLEMA: Múltiples funciones antiguas usan is_locked y driver_period_calculations
-- SOLUCIÓN: Actualizar todas para usar la estructura correcta con user_payrolls
-- ====================================================================

-- 1. ELIMINAR TODAS LAS FUNCIONES Y TRIGGERS ANTIGUOS DE CLEANUP
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_load_delete ON loads;
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_fuel_delete ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_deduction_delete ON expense_instances;
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_income_delete ON other_income;
DROP FUNCTION IF EXISTS trigger_check_empty_period_after_delete() CASCADE;
DROP FUNCTION IF EXISTS check_and_cleanup_empty_periods(uuid) CASCADE;

-- 2. RECREAR check_and_cleanup_empty_periods SIN is_locked y con user_payrolls
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
  -- Obtener información del período (sin is_locked/status)
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;

  -- Verificar si hay cargas asociadas al período
  SELECT EXISTS (
    SELECT 1 FROM loads 
    WHERE payment_period_id = target_period_id
  ) INTO has_loads;

  -- ✅ CORREGIDO: Verificar combustible usando user_payrolls
  SELECT EXISTS (
    SELECT 1 FROM fuel_expenses fe
    WHERE fe.payment_period_id = target_period_id
  ) INTO has_fuel_expenses;

  -- ✅ CORREGIDO: Verificar deducciones usando user_payrolls
  SELECT EXISTS (
    SELECT 1 FROM expense_instances ei
    WHERE ei.payment_period_id IN (
      SELECT id FROM user_payrolls up
      WHERE up.company_payment_period_id = target_period_id
    )
  ) INTO has_deductions;

  -- ✅ CORREGIDO: Verificar otros ingresos usando user_payrolls
  SELECT EXISTS (
    SELECT 1 FROM user_payrolls up
    WHERE up.company_payment_period_id = target_period_id
    AND up.other_income > 0
  ) INTO has_other_income;

  -- Si no hay datos asociados, eliminar el período
  IF NOT (has_loads OR has_fuel_expenses OR has_deductions OR has_other_income) THEN
    
    RAISE NOTICE '🧹 Eliminando período vacío: % (fechas: % - %)', 
      target_period_id, period_record.period_start_date, period_record.period_end_date;

    -- ✅ CORREGIDO: Primero eliminar deducciones usando user_payrolls
    DELETE FROM expense_instances
    WHERE payment_period_id IN (
      SELECT id FROM user_payrolls
      WHERE company_payment_period_id = target_period_id
    );

    -- ✅ CORREGIDO: Luego eliminar los cálculos usando user_payrolls
    DELETE FROM user_payrolls
    WHERE company_payment_period_id = target_period_id;
    
    GET DIAGNOSTICS deleted_calculations = ROW_COUNT;

    -- Finalmente eliminar el período de pago
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

-- 3. RECREAR trigger function SIN driver_period_calculations
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
    -- El fuel ya tiene payment_period_id directamente
    period_id_to_check := OLD.payment_period_id;
  ELSIF TG_TABLE_NAME = 'expense_instances' THEN
    -- ✅ CORREGIDO: Obtener el período vía user_payrolls
    SELECT up.company_payment_period_id INTO period_id_to_check
    FROM user_payrolls up
    WHERE up.id = OLD.payment_period_id;
  END IF;

  -- Solo verificar si encontramos un período válido
  IF period_id_to_check IS NOT NULL THEN
    PERFORM check_and_cleanup_empty_periods(period_id_to_check);
  END IF;

  RETURN OLD;
END;
$$;

-- 4. RECREAR TRIGGERS
CREATE TRIGGER trigger_cleanup_empty_period_after_load_delete
  AFTER DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_empty_period_after_delete();

CREATE TRIGGER trigger_cleanup_empty_period_after_fuel_delete
  AFTER DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_empty_period_after_delete();

CREATE TRIGGER trigger_cleanup_empty_period_after_deduction_delete
  AFTER DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_empty_period_after_delete();

-- 5. ACTUALIZAR cleanup_all_empty_periods SIN is_locked
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

  -- ✅ CORREGIDO: Revisar todos los períodos SIN filtrar por is_locked
  FOR period_record IN 
    SELECT id FROM company_payment_periods 
    WHERE company_id = target_company_id
    ORDER BY period_start_date
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

COMMENT ON FUNCTION check_and_cleanup_empty_periods IS 'FIXED: Removed is_locked checks and updated to use user_payrolls instead of driver_period_calculations';
COMMENT ON FUNCTION trigger_check_empty_period_after_delete IS 'FIXED: Updated to use user_payrolls instead of driver_period_calculations';
COMMENT ON FUNCTION cleanup_all_empty_periods IS 'FIXED: Removed is_locked filter and updated to use user_payrolls';