-- ============================================================================
-- FIX COMPLETO: Trigger debe SIEMPRE verificar y crear instancias faltantes
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_recurring_template_on_update ON expense_recurring_templates;

CREATE OR REPLACE FUNCTION sync_recurring_template_instances_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  affected_payroll RECORD;
  instances_created INTEGER := 0;
  instances_updated INTEGER := 0;
  payrolls_recalculated INTEGER := 0;
  missing_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Template UPDATE: ID=%, user=%, is_active=%', NEW.id, NEW.user_id, NEW.is_active;

  -- ============================================================================
  -- PASO 1: Si cambió monto o tipo, actualizar instancias existentes
  -- ============================================================================
  IF (OLD.amount != NEW.amount OR OLD.expense_type_id != NEW.expense_type_id) 
     AND NEW.is_active = true THEN
    
    RAISE NOTICE '💰 Actualizando instancias existentes por cambio de monto/tipo';
    
    FOR affected_payroll IN
      SELECT 
        ei.id as instance_id,
        up.id as user_payroll_id
      FROM expense_instances ei
      JOIN user_payrolls up ON ei.payment_period_id = up.id
      WHERE ei.recurring_template_id = NEW.id
        AND up.payment_status != 'paid'
    LOOP
      UPDATE expense_instances
      SET 
        amount = NEW.amount,
        expense_type_id = NEW.expense_type_id,
        updated_at = now()
      WHERE id = affected_payroll.instance_id;
      
      instances_updated := instances_updated + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Actualizadas % instancias', instances_updated;
  END IF;

  -- ============================================================================
  -- PASO 2: SIEMPRE verificar y crear instancias faltantes si está activo
  -- ============================================================================
  IF NEW.is_active = true THEN
    RAISE NOTICE '🔍 Verificando instancias faltantes para template %', NEW.id;
    
    -- Contar cuántos períodos no tienen instancia
    SELECT COUNT(*) INTO missing_count
    FROM user_payrolls up
    JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
    WHERE up.user_id = NEW.user_id
      AND up.payment_status != 'paid'
      AND NEW.start_date <= cpp.period_end_date
      AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
      AND NOT EXISTS (
        SELECT 1 FROM expense_instances ei
        WHERE ei.recurring_template_id = NEW.id
          AND ei.payment_period_id = up.id
          AND ei.user_id = NEW.user_id
      );
    
    IF missing_count > 0 THEN
      RAISE NOTICE '⚠️ Encontradas % instancias faltantes, creándolas...', missing_count;
      
      -- Crear instancias faltantes
      FOR affected_payroll IN
        SELECT 
          up.id as user_payroll_id,
          up.user_id,
          up.company_payment_period_id,
          cpp.period_start_date,
          cpp.period_end_date
        FROM user_payrolls up
        JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
        WHERE up.user_id = NEW.user_id
          AND up.payment_status != 'paid'
          AND NEW.start_date <= cpp.period_end_date
          AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
          AND NOT EXISTS (
            SELECT 1 FROM expense_instances ei
            WHERE ei.recurring_template_id = NEW.id
              AND ei.payment_period_id = up.id
              AND ei.user_id = NEW.user_id
          )
      LOOP
        RAISE NOTICE '📝 Creando instancia para período % - %',
          affected_payroll.period_start_date,
          affected_payroll.period_end_date;
        
        -- Aplicar deducciones recurrentes al período
        PERFORM apply_recurring_expenses_to_user_payroll(
          affected_payroll.user_id,
          affected_payroll.company_payment_period_id
        );
        instances_created := instances_created + 1;
        
        -- Recalcular el payroll
        BEGIN
          PERFORM calculate_user_payment_period_with_validation(affected_payroll.user_payroll_id);
          payrolls_recalculated := payrolls_recalculated + 1;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Error recalculando payroll %: %', affected_payroll.user_payroll_id, SQLERRM;
        END;
      END LOOP;
      
      RAISE NOTICE '✅ Creadas % instancias, recalculados % payrolls',
        instances_created, payrolls_recalculated;
    ELSE
      RAISE NOTICE '✅ No hay instancias faltantes';
    END IF;
  END IF;

  RAISE NOTICE '🎯 Trigger completado: % actualizadas, % creadas, % recalculados',
    instances_updated, instances_created, payrolls_recalculated;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_sync_recurring_template_on_update
  AFTER UPDATE ON expense_recurring_templates
  FOR EACH ROW
  EXECUTE FUNCTION sync_recurring_template_instances_on_update();