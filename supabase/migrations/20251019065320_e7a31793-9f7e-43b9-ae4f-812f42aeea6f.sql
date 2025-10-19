-- ============================================================================
-- CORRECCIÓN: sync_recurring_template_instances_on_update también debe usar user_payroll.id
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_recurring_template_instances_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  affected_payroll RECORD;
  instances_updated INTEGER := 0;
  instances_deleted INTEGER := 0;
  instances_created INTEGER := 0;
  payrolls_recalculated INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 UPDATE Template: Processing changes for template %', NEW.id;

  -- ============================================================================
  -- ESCENARIO 1: Desactivar template (is_active: true -> false)
  -- ============================================================================
  IF OLD.is_active = true AND NEW.is_active = false THEN
    RAISE NOTICE '🔴 Template desactivado, eliminando instancias en períodos no pagados';
    
    -- Eliminar instancias solo de user_payrolls no pagados
    FOR affected_payroll IN
      SELECT 
        up.id as user_payroll_id,
        up.user_id,
        up.company_payment_period_id,
        cpp.period_start_date,
        cpp.period_end_date
      FROM expense_instances ei
      JOIN user_payrolls up ON ei.payment_period_id = up.id
      JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
      WHERE ei.recurring_template_id = NEW.id
        AND up.payment_status != 'paid'
    LOOP
      -- ✅ Usar user_payroll_id
      DELETE FROM expense_instances
      WHERE recurring_template_id = NEW.id
        AND payment_period_id = affected_payroll.user_payroll_id;
      
      instances_deleted := instances_deleted + 1;
      
      -- Recalcular
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(affected_payroll.user_payroll_id);
        payrolls_recalculated := payrolls_recalculated + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error recalculando payroll %: %', affected_payroll.user_payroll_id, SQLERRM;
      END;
    END LOOP;
    
    RAISE NOTICE '✅ Desactivación completada: % instancias eliminadas, % payrolls recalculados',
      instances_deleted, payrolls_recalculated;
    RETURN NEW;
  END IF;

  -- ============================================================================
  -- ESCENARIO 2: Reactivar template (is_active: false -> true)
  -- ============================================================================
  IF OLD.is_active = false AND NEW.is_active = true THEN
    RAISE NOTICE '🟢 Template reactivado, creando instancias faltantes';
    
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
      -- Aplicar deducciones para este período
      PERFORM apply_recurring_expenses_to_user_payroll(
        affected_payroll.user_id, 
        affected_payroll.company_payment_period_id
      );
      
      -- Recalcular
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(affected_payroll.user_payroll_id);
        payrolls_recalculated := payrolls_recalculated + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error recalculando payroll %: %', affected_payroll.user_payroll_id, SQLERRM;
      END;
    END LOOP;
    
    RAISE NOTICE '✅ Reactivación completada: % payrolls procesados',
      payrolls_recalculated;
    RETURN NEW;
  END IF;

  -- ============================================================================
  -- ESCENARIO 3: Cambio de monto o tipo de gasto
  -- ============================================================================
  IF (OLD.amount != NEW.amount OR OLD.expense_type_id != NEW.expense_type_id) 
     AND NEW.is_active = true THEN
    RAISE NOTICE '💰 Monto o tipo cambiado, actualizando instancias existentes';
    
    FOR affected_payroll IN
      SELECT 
        ei.id as instance_id,
        up.id as user_payroll_id,
        up.user_id,
        up.company_payment_period_id
      FROM expense_instances ei
      JOIN user_payrolls up ON ei.payment_period_id = up.id
      WHERE ei.recurring_template_id = NEW.id
        AND up.payment_status != 'paid'
    LOOP
      -- Actualizar la instancia
      UPDATE expense_instances
      SET 
        amount = NEW.amount,
        expense_type_id = NEW.expense_type_id,
        description = 'Recurring expense: ' || (
          SELECT name FROM expense_types WHERE id = NEW.expense_type_id
        ),
        updated_at = now()
      WHERE id = affected_payroll.instance_id;
      
      instances_updated := instances_updated + 1;
      
      -- Recalcular
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(affected_payroll.user_payroll_id);
        payrolls_recalculated := payrolls_recalculated + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error recalculando payroll %: %', affected_payroll.user_payroll_id, SQLERRM;
      END;
    END LOOP;
    
    RAISE NOTICE '✅ Actualización completada: % instancias actualizadas, % payrolls recalculados',
      instances_updated, payrolls_recalculated;
  END IF;

  -- ============================================================================
  -- ESCENARIO 4: Cambio de fechas (start_date o end_date)
  -- ============================================================================
  IF (OLD.start_date != NEW.start_date OR 
      COALESCE(OLD.end_date::TEXT, 'NULL') != COALESCE(NEW.end_date::TEXT, 'NULL'))
     AND NEW.is_active = true THEN
    RAISE NOTICE '📅 Fechas cambiadas, sincronizando instancias';
    
    -- Eliminar instancias que ya no califican
    FOR affected_payroll IN
      SELECT 
        ei.id as instance_id,
        up.id as user_payroll_id,
        cpp.period_start_date,
        cpp.period_end_date
      FROM expense_instances ei
      JOIN user_payrolls up ON ei.payment_period_id = up.id
      JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
      WHERE ei.recurring_template_id = NEW.id
        AND up.payment_status != 'paid'
        AND (NEW.start_date > cpp.period_end_date 
             OR (NEW.end_date IS NOT NULL AND NEW.end_date < cpp.period_start_date))
    LOOP
      DELETE FROM expense_instances WHERE id = affected_payroll.instance_id;
      instances_deleted := instances_deleted + 1;
      
      -- Recalcular
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(affected_payroll.user_payroll_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error recalculando payroll %: %', affected_payroll.user_payroll_id, SQLERRM;
      END;
    END LOOP;
    
    -- Crear instancias faltantes para períodos que ahora califican
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
      -- Aplicar deducciones para este período
      PERFORM apply_recurring_expenses_to_user_payroll(
        affected_payroll.user_id,
        affected_payroll.company_payment_period_id
      );
      instances_created := instances_created + 1;
    END LOOP;
    
    -- Recalcular todos los payrolls afectados
    FOR affected_payroll IN
      SELECT DISTINCT up.id as user_payroll_id
      FROM user_payrolls up
      JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
      WHERE up.user_id = NEW.user_id
        AND up.payment_status != 'paid'
        AND (NEW.start_date <= cpp.period_end_date 
             AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
             OR OLD.start_date <= cpp.period_end_date 
             AND (OLD.end_date IS NULL OR OLD.end_date >= cpp.period_start_date))
    LOOP
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(affected_payroll.user_payroll_id);
        payrolls_recalculated := payrolls_recalculated + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error recalculando payroll %: %', affected_payroll.user_payroll_id, SQLERRM;
      END;
    END LOOP;
    
    RAISE NOTICE '✅ Sincronización de fechas completada: % eliminadas, % creadas, % recalculados',
      instances_deleted, instances_created, payrolls_recalculated;
  END IF;

  RETURN NEW;
END;
$function$;