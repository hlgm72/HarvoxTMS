
-- ============================================================================
-- FIX: Actualizar trigger de creación para respetar las mismas validaciones
-- ============================================================================

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
  apply_result JSONB;
BEGIN
  RAISE NOTICE '📝 CREATE Template: Aplicando nuevo template % para usuario %', 
    NEW.id, NEW.user_id;

  -- Solo procesar si el template está activo
  IF NOT NEW.is_active THEN
    RAISE NOTICE '⏸️ Template creado inactivo, no se aplicará a períodos existentes';
    RETURN NEW;
  END IF;

  -- ✅ Buscar user_payrolls que cumplan TODAS las validaciones:
  -- 1. No estén pagados
  -- 2. No sean fechas futuras (period_start_date <= CURRENT_DATE)
  -- 3. Caigan dentro del rango de fechas del template
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
      AND up.payment_status != 'paid'  -- ✅ No modificar pagados
      AND cpp.period_start_date <= CURRENT_DATE  -- ✅ No períodos futuros
      AND NEW.start_date <= cpp.period_end_date
      AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
  LOOP
    RAISE NOTICE '🎯 Aplicando template a payroll % (período % - %)', 
      affected_payroll.id, 
      affected_payroll.period_start_date,
      affected_payroll.period_end_date;
    
    -- Aplicar deducciones recurrentes para este payroll
    SELECT apply_recurring_expenses_to_user_payroll(
      affected_payroll.user_id,
      affected_payroll.company_payment_period_id
    ) INTO apply_result;
    
    IF (apply_result->>'success')::BOOLEAN THEN
      instances_created := instances_created + 1;

      -- Recalcular el payroll para incluir las nuevas deducciones
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
$function$;

COMMENT ON FUNCTION sync_recurring_template_on_insert IS 
'Aplica un nuevo template recurrente a payrolls existentes.
✅ Solo payrolls no pagados (payment_status != paid)
✅ Solo períodos actuales o pasados (period_start_date <= CURRENT_DATE)
✅ Respeta el rango de fechas del template';
