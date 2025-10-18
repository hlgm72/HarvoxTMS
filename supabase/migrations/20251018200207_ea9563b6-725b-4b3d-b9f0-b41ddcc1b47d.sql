-- ====================================================================
-- 🔧 CORRECCIÓN: Actualizar trigger auto_cleanup para usar user_payrolls
-- ====================================================================
-- 
-- PROBLEMA: El trigger auto_cleanup_empty_periods usa driver_period_calculations
--           que es una tabla obsoleta, debe usar user_payrolls
-- SOLUCIÓN: Actualizar el trigger para usar la estructura correcta
-- ====================================================================

-- 1. ELIMINAR TRIGGER Y FUNCIÓN ANTIGUOS
DROP TRIGGER IF EXISTS trigger_auto_cleanup_empty_periods ON loads;
DROP FUNCTION IF EXISTS auto_cleanup_empty_periods() CASCADE;

-- 2. CREAR FUNCIÓN ACTUALIZADA DEL TRIGGER
CREATE OR REPLACE FUNCTION auto_cleanup_empty_periods()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_record RECORD;
  has_loads BOOLEAN := false;
  has_fuel_expenses BOOLEAN := false;
  has_other_income BOOLEAN := false;
  has_deductions BOOLEAN := false;
  deleted_calculations INTEGER := 0;
  deleted_expenses INTEGER := 0;
  deleted_periods INTEGER := 0;
BEGIN
  -- Solo procesar si se eliminó o cambió payment_period_id
  IF (TG_OP = 'DELETE' AND OLD.payment_period_id IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND OLD.payment_period_id IS NOT NULL AND NEW.payment_period_id IS NULL) THEN
    
    -- Obtener información del período (sin is_locked/status)
    SELECT * INTO period_record
    FROM company_payment_periods
    WHERE id = COALESCE(OLD.payment_period_id, NEW.payment_period_id);
    
    IF period_record.id IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    -- Verificar si hay cargas asociadas
    SELECT EXISTS (
      SELECT 1 FROM loads 
      WHERE payment_period_id = period_record.id
    ) INTO has_loads;

    -- Verificar si hay gastos de combustible asociados
    SELECT EXISTS (
      SELECT 1 FROM fuel_expenses 
      WHERE payment_period_id = period_record.id
    ) INTO has_fuel_expenses;

    -- ✅ CORREGIDO: Verificar si hay ingresos adicionales usando user_payrolls
    SELECT EXISTS (
      SELECT 1 FROM user_payrolls 
      WHERE company_payment_period_id = period_record.id 
      AND other_income > 0
    ) INTO has_other_income;

    -- ✅ CORREGIDO: Verificar si hay deducciones usando user_payrolls
    SELECT EXISTS (
      SELECT 1 FROM expense_instances ei
      WHERE ei.payment_period_id IN (
        SELECT id FROM user_payrolls up
        WHERE up.company_payment_period_id = period_record.id
      )
    ) INTO has_deductions;

    -- Si no hay ningún dato asociado, eliminar el período
    IF NOT has_loads AND NOT has_fuel_expenses AND NOT has_other_income AND NOT has_deductions THEN
      
      RAISE LOG 'Auto-limpieza: Eliminando período vacío % (fechas: % - %)', 
        period_record.id, period_record.period_start_date, period_record.period_end_date;

      -- ✅ CORREGIDO: Eliminar deducciones usando user_payrolls
      DELETE FROM expense_instances
      WHERE payment_period_id IN (
        SELECT id FROM user_payrolls
        WHERE company_payment_period_id = period_record.id
      );
      GET DIAGNOSTICS deleted_expenses = ROW_COUNT;

      -- ✅ CORREGIDO: Eliminar cálculos usando user_payrolls
      DELETE FROM user_payrolls
      WHERE company_payment_period_id = period_record.id;
      GET DIAGNOSTICS deleted_calculations = ROW_COUNT;

      -- Eliminar el período
      DELETE FROM company_payment_periods
      WHERE id = period_record.id;
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
          'period_id', period_record.id,
          'company_id', period_record.company_id,
          'trigger_reason', 'period_became_empty',
          'deleted_calculations', deleted_calculations,
          'deleted_expenses', deleted_expenses,
          'deleted_periods', deleted_periods,
          'period_dates', jsonb_build_object(
            'start', period_record.period_start_date,
            'end', period_record.period_end_date
          )
        ),
        auth.uid(),
        deleted_calculations + deleted_expenses + deleted_periods,
        'completed'
      );

      RAISE LOG 'Auto-limpieza completada: % períodos, % cálculos, % deducciones eliminadas', 
        deleted_periods, deleted_calculations, deleted_expenses;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. RECREAR TRIGGER
CREATE TRIGGER trigger_auto_cleanup_empty_periods
  AFTER UPDATE OF payment_period_id OR DELETE
  ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_cleanup_empty_periods();

COMMENT ON FUNCTION auto_cleanup_empty_periods IS 'FIXED: Updated to use user_payrolls instead of driver_period_calculations. Removed references to is_locked/status fields.';