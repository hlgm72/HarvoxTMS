-- ============================================================================
-- Trigger para aplicar deducciones recurrentes cuando se CREA un nuevo template
-- ============================================================================

-- Función para aplicar un nuevo template recurrente a payrolls existentes no pagados
CREATE OR REPLACE FUNCTION sync_recurring_template_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  affected_payroll RECORD;
  instances_created INTEGER := 0;
  payrolls_recalculated INTEGER := 0;
BEGIN
  RAISE NOTICE '📝 CREATE Template: Aplicando nuevo template % para usuario %', 
    NEW.id, NEW.user_id;

  -- Solo procesar si el template está activo
  IF NOT NEW.is_active THEN
    RAISE NOTICE '⏸️ Template creado inactivo, no se aplicará a períodos existentes';
    RETURN NEW;
  END IF;

  -- Buscar todos los user_payrolls existentes para este usuario que:
  -- 1. No estén pagados
  -- 2. Caigan dentro del rango de fechas del template
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
      AND NEW.start_date <= cpp.period_end_date
      AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
  LOOP
    RAISE NOTICE '🎯 Aplicando template a payroll % (período % - %)', 
      affected_payroll.id, 
      affected_payroll.period_start_date,
      affected_payroll.period_end_date;
    
    -- Aplicar deducciones recurrentes para este payroll
    PERFORM apply_recurring_expenses_to_user_payroll(
      affected_payroll.user_id,
      affected_payroll.company_payment_period_id
    );
    instances_created := instances_created + 1;

    -- Recalcular el payroll para incluir las nuevas deducciones
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(affected_payroll.id);
      payrolls_recalculated := payrolls_recalculated + 1;
      RAISE NOTICE '✅ Payroll % recalculado exitosamente', affected_payroll.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Error recalculando payroll %: %', affected_payroll.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ CREATE Template completado: % instancias creadas, % payrolls recalculados',
    instances_created, payrolls_recalculated;

  RETURN NEW;
END;
$function$;

-- Crear el trigger AFTER INSERT
DROP TRIGGER IF EXISTS trigger_sync_recurring_template_on_insert ON expense_recurring_templates;

CREATE TRIGGER trigger_sync_recurring_template_on_insert
  AFTER INSERT ON expense_recurring_templates
  FOR EACH ROW
  EXECUTE FUNCTION sync_recurring_template_on_insert();

COMMENT ON TRIGGER trigger_sync_recurring_template_on_insert ON expense_recurring_templates IS 
'Aplica automáticamente un nuevo template recurrente a todos los user_payrolls existentes no pagados del usuario';