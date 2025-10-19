-- ============================================================================
-- FIX COMPLETO: Recrear trigger y función RPC desde cero
-- ============================================================================

-- 1. Eliminar trigger existente
DROP TRIGGER IF EXISTS trigger_sync_recurring_template_on_update ON expense_recurring_templates;

-- 2. Recrear función del trigger (simplificada sin acceso a OLD/NEW is_active)
CREATE OR REPLACE FUNCTION sync_recurring_template_instances_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  affected_payroll RECORD;
  instances_updated INTEGER := 0;
  payrolls_recalculated INTEGER := 0;
  was_active BOOLEAN;
  is_now_active BOOLEAN;
BEGIN
  -- Obtener estados de is_active de manera segura
  was_active := OLD.is_active;
  is_now_active := NEW.is_active;
  
  RAISE NOTICE '🔄 Template UPDATE: ID=%, was_active=%, is_now_active=%', NEW.id, was_active, is_now_active;

  -- Solo procesar si cambió el monto o tipo en un template activo
  IF (OLD.amount != NEW.amount OR OLD.expense_type_id != NEW.expense_type_id) 
     AND is_now_active = true THEN
    
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
      
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(affected_payroll.user_payroll_id);
        payrolls_recalculated := payrolls_recalculated + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error recalculando payroll: %', SQLERRM;
      END;
    END LOOP;
    
    RAISE NOTICE '✅ Updated % instances, recalculated % payrolls', instances_updated, payrolls_recalculated;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Recrear trigger
CREATE TRIGGER trigger_sync_recurring_template_on_update
  AFTER UPDATE ON expense_recurring_templates
  FOR EACH ROW
  EXECUTE FUNCTION sync_recurring_template_instances_on_update();