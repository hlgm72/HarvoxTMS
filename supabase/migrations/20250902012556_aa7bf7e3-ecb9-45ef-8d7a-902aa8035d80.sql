-- Eliminar todos los triggers y la función con CASCADE
DROP TRIGGER IF EXISTS trigger_auto_cleanup_empty_periods ON loads;
DROP TRIGGER IF EXISTS auto_cleanup_after_load_delete ON loads;
DROP TRIGGER IF EXISTS auto_cleanup_after_fuel_delete ON fuel_expenses;
DROP TRIGGER IF EXISTS auto_cleanup_after_expense_delete ON expense_instances;
DROP FUNCTION IF EXISTS auto_cleanup_empty_periods() CASCADE;

-- Nueva función mejorada que verifica todos los datos del período
CREATE OR REPLACE FUNCTION auto_cleanup_empty_periods()
RETURNS TRIGGER AS $$
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
    
    -- Obtener información del período
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

    -- Verificar si hay ingresos adicionales en los cálculos
    SELECT EXISTS (
      SELECT 1 FROM driver_period_calculations 
      WHERE company_payment_period_id = period_record.id 
      AND other_income > 0
    ) INTO has_other_income;

    -- Verificar si hay deducciones aplicadas
    SELECT EXISTS (
      SELECT 1 FROM expense_instances ei
      JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
      WHERE dpc.company_payment_period_id = period_record.id
    ) INTO has_deductions;

    -- Si no hay ningún dato asociado, eliminar el período
    IF NOT has_loads AND NOT has_fuel_expenses AND NOT has_other_income AND NOT has_deductions THEN
      
      RAISE LOG 'Auto-limpieza: Eliminando período vacío % (fechas: % - %)', 
        period_record.id, period_record.period_start_date, period_record.period_end_date;

      -- 1. Eliminar deducciones huérfanas
      DELETE FROM expense_instances
      WHERE payment_period_id IN (
        SELECT id FROM driver_period_calculations
        WHERE company_payment_period_id = period_record.id
      );
      GET DIAGNOSTICS deleted_expenses = ROW_COUNT;

      -- 2. Eliminar cálculos de conductores
      DELETE FROM driver_period_calculations
      WHERE company_payment_period_id = period_record.id;
      GET DIAGNOSTICS deleted_calculations = ROW_COUNT;

      -- 3. Eliminar el período
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger mejorado solo en loads
CREATE TRIGGER trigger_auto_cleanup_empty_periods
  AFTER UPDATE OF payment_period_id OR DELETE
  ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_cleanup_empty_periods();