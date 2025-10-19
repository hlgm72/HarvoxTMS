-- Recrear trigger de inserción para plantillas recurrentes
DROP TRIGGER IF EXISTS trigger_sync_recurring_template_on_insert ON expense_recurring_templates;

CREATE OR REPLACE FUNCTION sync_recurring_template_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  affected_payroll RECORD;
  instances_created INTEGER := 0;
  payrolls_recalculated INTEGER := 0;
  apply_result JSONB;
  template_is_active BOOLEAN;
BEGIN
  -- Deshabilitar RLS temporalmente
  SET LOCAL row_security = off;
  
  -- Leer is_active de forma segura
  template_is_active := NEW.is_active;
  
  RAISE NOTICE '📝 CREATE Template: Aplicando nuevo template % para usuario %, is_active=%', 
    NEW.id, NEW.user_id, template_is_active;

  -- Solo procesar si el template está activo
  IF NOT template_is_active THEN
    RAISE NOTICE '⏸️ Template creado inactivo, no se aplicará a períodos existentes';
    RETURN NEW;
  END IF;

  -- Buscar user_payrolls que cumplan TODAS las validaciones
  FOR affected_payroll IN
    SELECT 
      up.id,
      up.user_id,
      up.company_payment_period_id,
      cpp.period_start_date,
      cpp.period_end_date
    FROM user_payrolls up
    JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
    WHERE up.user_id = NEW.user_id
      AND up.payment_status != 'paid'
      AND cpp.period_start_date <= CURRENT_DATE
      AND NEW.start_date <= cpp.period_end_date
      AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
  LOOP
    RAISE NOTICE '🎯 Aplicando template a payroll % (período % - %)', 
      affected_payroll.id, 
      affected_payroll.period_start_date,
      affected_payroll.period_end_date;
    
    SELECT apply_recurring_expenses_to_user_payroll(
      affected_payroll.user_id,
      affected_payroll.company_payment_period_id
    ) INTO apply_result;
    
    IF (apply_result->>'success')::BOOLEAN THEN
      instances_created := instances_created + 1;

      BEGIN
        PERFORM calculate_user_payment_period_with_validation(affected_payroll.id);
        payrolls_recalculated := payrolls_recalculated + 1;
        RAISE NOTICE '✅ Payroll % recalculado exitosamente', affected_payroll.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '⚠️ Error recalculando payroll %: %', affected_payroll.id, SQLERRM;
      END;
    ELSE
      RAISE NOTICE '⚠️ Failed to apply template to period %: %', 
        affected_payroll.company_payment_period_id, 
        apply_result->>'message';
    END IF;
  END LOOP;

  RAISE NOTICE '✅ CREATE Template completado: % períodos procesados, % payrolls recalculados',
    instances_created, payrolls_recalculated;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_recurring_template_on_insert
AFTER INSERT ON expense_recurring_templates
FOR EACH ROW
EXECUTE FUNCTION sync_recurring_template_on_insert();