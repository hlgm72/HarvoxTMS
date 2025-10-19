-- 🔄 SISTEMA DE SINCRONIZACIÓN DE TEMPLATES RECURRENTES v1.0
-- Maneja automáticamente los cambios en expense_recurring_templates
-- Actualiza instancias solo en períodos NO pagados

-- ============================================================================
-- 1. FUNCIÓN para sincronizar instancias cuando se edita un template
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_recurring_template_instances_on_update()
RETURNS TRIGGER AS $$
DECLARE
  affected_payroll RECORD;
  period_record RECORD;
  instances_updated INTEGER := 0;
  instances_deleted INTEGER := 0;
  instances_created INTEGER := 0;
  payrolls_recalculated INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 sync_recurring_template: Template % updated', NEW.id;
  
  -- Solo procesar si el template realmente cambió
  IF OLD = NEW THEN
    RAISE NOTICE '⏭️ No changes detected, skipping sync';
    RETURN NEW;
  END IF;
  
  -- ============================================================================
  -- ESCENARIO 1: Template DESACTIVADO (is_active = false)
  -- ============================================================================
  IF OLD.is_active = true AND NEW.is_active = false THEN
    RAISE NOTICE '🚫 Template desactivado - eliminando instancias futuras';
    
    -- Eliminar instancias en períodos NO pagados
    DELETE FROM expense_instances ei
    USING user_payrolls up
    WHERE ei.recurring_template_id = NEW.id
      AND ei.payment_period_id = up.company_payment_period_id
      AND up.payment_status != 'paid'
      AND ei.user_id = NEW.user_id;
    
    GET DIAGNOSTICS instances_deleted = ROW_COUNT;
    RAISE NOTICE '✅ Eliminadas % instancias de template desactivado', instances_deleted;
    
    -- Recalcular payrolls afectados
    FOR affected_payroll IN
      SELECT DISTINCT up.id, up.user_id, up.company_payment_period_id
      FROM user_payrolls up
      WHERE up.user_id = NEW.user_id
        AND up.payment_status != 'paid'
    LOOP
      PERFORM calculate_user_payment_period_with_validation(affected_payroll.id);
      payrolls_recalculated := payrolls_recalculated + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Recalculados % payrolls', payrolls_recalculated;
    RETURN NEW;
  END IF;
  
  -- ============================================================================
  -- ESCENARIO 2: Template REACTIVADO (is_active = true)
  -- ============================================================================
  IF OLD.is_active = false AND NEW.is_active = true THEN
    RAISE NOTICE '✅ Template reactivado - creando instancias faltantes';
    
    -- Crear instancias en períodos NO pagados que califican
    FOR affected_payroll IN
      SELECT up.id, up.user_id, up.company_payment_period_id, 
             cpp.period_start_date, cpp.period_end_date
      FROM user_payrolls up
      JOIN company_payment_periods cpp ON cpp.id = up.company_payment_period_id
      WHERE up.user_id = NEW.user_id
        AND up.payment_status != 'paid'
        AND NEW.start_date <= cpp.period_end_date
        AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
    LOOP
      -- Aplicar deducciones para este período
      PERFORM apply_recurring_expenses_to_user_payroll(
        affected_payroll.user_id, 
        affected_payroll.company_payment_period_id
      );
      
      -- Recalcular
      PERFORM calculate_user_payment_period_with_validation(affected_payroll.id);
      payrolls_recalculated := payrolls_recalculated + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Recalculados % payrolls', payrolls_recalculated;
    RETURN NEW;
  END IF;
  
  -- ============================================================================
  -- ESCENARIO 3: Cambio de MONTO o TIPO DE GASTO
  -- ============================================================================
  IF NEW.is_active = true AND (
    OLD.amount != NEW.amount OR 
    OLD.expense_type_id != NEW.expense_type_id
  ) THEN
    RAISE NOTICE '💰 Actualizando monto/tipo de gasto en instancias existentes';
    
    -- Actualizar instancias en períodos NO pagados
    UPDATE expense_instances ei
    SET 
      amount = NEW.amount,
      expense_type_id = NEW.expense_type_id,
      description = 'Recurring expense: ' || (SELECT name FROM expense_types WHERE id = NEW.expense_type_id),
      updated_at = now()
    FROM user_payrolls up
    WHERE ei.recurring_template_id = NEW.id
      AND ei.payment_period_id = up.company_payment_period_id
      AND up.payment_status != 'paid'
      AND ei.user_id = NEW.user_id;
    
    GET DIAGNOSTICS instances_updated = ROW_COUNT;
    RAISE NOTICE '✅ Actualizadas % instancias', instances_updated;
    
    -- Recalcular payrolls afectados
    FOR affected_payroll IN
      SELECT DISTINCT up.id
      FROM user_payrolls up
      JOIN expense_instances ei ON ei.payment_period_id = up.company_payment_period_id
      WHERE ei.recurring_template_id = NEW.id
        AND up.user_id = NEW.user_id
        AND up.payment_status != 'paid'
    LOOP
      PERFORM calculate_user_payment_period_with_validation(affected_payroll.id);
      payrolls_recalculated := payrolls_recalculated + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Recalculados % payrolls', payrolls_recalculated;
  END IF;
  
  -- ============================================================================
  -- ESCENARIO 4: Cambio de FECHAS (start_date / end_date)
  -- ============================================================================
  IF NEW.is_active = true AND (
    OLD.start_date != NEW.start_date OR 
    COALESCE(OLD.end_date, '9999-12-31'::date) != COALESCE(NEW.end_date, '9999-12-31'::date)
  ) THEN
    RAISE NOTICE '📅 Cambio de fechas - ajustando instancias';
    
    -- Eliminar instancias que ya no califican (fuera del nuevo rango de fechas)
    DELETE FROM expense_instances ei
    USING user_payrolls up, company_payment_periods cpp
    WHERE ei.recurring_template_id = NEW.id
      AND ei.payment_period_id = up.company_payment_period_id
      AND up.company_payment_period_id = cpp.id
      AND up.payment_status != 'paid'
      AND ei.user_id = NEW.user_id
      AND (
        NEW.start_date > cpp.period_end_date OR
        (NEW.end_date IS NOT NULL AND NEW.end_date < cpp.period_start_date)
      );
    
    GET DIAGNOSTICS instances_deleted = ROW_COUNT;
    RAISE NOTICE '🗑️ Eliminadas % instancias fuera del nuevo rango', instances_deleted;
    
    -- Crear instancias faltantes en períodos que ahora califican
    FOR affected_payroll IN
      SELECT up.id, up.user_id, up.company_payment_period_id,
             cpp.period_start_date, cpp.period_end_date
      FROM user_payrolls up
      JOIN company_payment_periods cpp ON cpp.id = up.company_payment_period_id
      WHERE up.user_id = NEW.user_id
        AND up.payment_status != 'paid'
        AND NEW.start_date <= cpp.period_end_date
        AND (NEW.end_date IS NULL OR NEW.end_date >= cpp.period_start_date)
        -- Solo si no existe ya una instancia
        AND NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.recurring_template_id = NEW.id
            AND ei.payment_period_id = cpp.id
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
    
    RAISE NOTICE '✅ Creadas % instancias en nuevos períodos', instances_created;
    
    -- Recalcular todos los payrolls afectados
    FOR affected_payroll IN
      SELECT DISTINCT up.id
      FROM user_payrolls up
      WHERE up.user_id = NEW.user_id
        AND up.payment_status != 'paid'
    LOOP
      PERFORM calculate_user_payment_period_with_validation(affected_payroll.id);
      payrolls_recalculated := payrolls_recalculated + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Recalculados % payrolls', payrolls_recalculated;
  END IF;
  
  RAISE NOTICE '🎉 sync_recurring_template completado: % actualizadas, % eliminadas, % creadas, % recalculados',
    instances_updated, instances_deleted, instances_created, payrolls_recalculated;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Error sincronizando template %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. CREAR trigger para sincronización automática
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_sync_recurring_template_on_update ON expense_recurring_templates;

CREATE TRIGGER trigger_sync_recurring_template_on_update
  AFTER UPDATE ON expense_recurring_templates
  FOR EACH ROW
  EXECUTE FUNCTION sync_recurring_template_instances_on_update();

-- ============================================================================
-- 3. FUNCIÓN auxiliar para verificar integridad de instancias recurrentes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_recurring_instances_integrity(
  template_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  missing_instances INTEGER := 0;
  extra_instances INTEGER := 0;
  mismatched_amounts INTEGER := 0;
  result jsonb;
BEGIN
  -- Contar instancias faltantes (deberían existir pero no existen)
  SELECT COUNT(*) INTO missing_instances
  FROM expense_recurring_templates ert
  CROSS JOIN user_payrolls up
  JOIN company_payment_periods cpp ON cpp.id = up.company_payment_period_id
  WHERE ert.user_id = up.user_id
    AND ert.is_active = true
    AND ert.start_date <= cpp.period_end_date
    AND (ert.end_date IS NULL OR ert.end_date >= cpp.period_start_date)
    AND up.payment_status != 'paid'
    AND (template_id_param IS NULL OR ert.id = template_id_param)
    AND NOT EXISTS (
      SELECT 1 FROM expense_instances ei
      WHERE ei.recurring_template_id = ert.id
        AND ei.payment_period_id = cpp.id
        AND ei.user_id = ert.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM recurring_expense_exclusions rex
      WHERE rex.recurring_template_id = ert.id
        AND rex.payment_period_id = cpp.id
        AND rex.is_active = true
    );
  
  -- Contar instancias sobrantes (existen pero no deberían)
  SELECT COUNT(*) INTO extra_instances
  FROM expense_instances ei
  JOIN expense_recurring_templates ert ON ert.id = ei.recurring_template_id
  JOIN company_payment_periods cpp ON cpp.id = ei.payment_period_id
  WHERE (template_id_param IS NULL OR ei.recurring_template_id = template_id_param)
    AND (
      ert.is_active = false OR
      ert.start_date > cpp.period_end_date OR
      (ert.end_date IS NOT NULL AND ert.end_date < cpp.period_start_date)
    );
  
  -- Contar instancias con montos incorrectos
  SELECT COUNT(*) INTO mismatched_amounts
  FROM expense_instances ei
  JOIN expense_recurring_templates ert ON ert.id = ei.recurring_template_id
  WHERE (template_id_param IS NULL OR ei.recurring_template_id = template_id_param)
    AND ei.amount != ert.amount
    AND ert.is_active = true;
  
  result := jsonb_build_object(
    'success', true,
    'missing_instances', missing_instances,
    'extra_instances', extra_instances,
    'mismatched_amounts', mismatched_amounts,
    'total_issues', missing_instances + extra_instances + mismatched_amounts,
    'is_healthy', (missing_instances + extra_instances + mismatched_amounts) = 0
  );
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION verify_recurring_instances_integrity IS 
'Verifica la integridad de las instancias de deducciones recurrentes. 
Detecta instancias faltantes, sobrantes, o con montos incorrectos.';