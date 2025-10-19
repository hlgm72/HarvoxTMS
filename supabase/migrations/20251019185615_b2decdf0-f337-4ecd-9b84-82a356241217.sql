-- Recrear función de actualización de templates recurrentes
DROP FUNCTION IF EXISTS sync_recurring_template_instances_on_update() CASCADE;

CREATE OR REPLACE FUNCTION sync_recurring_template_instances_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  affected_payroll RECORD;
  instances_created INTEGER := 0;
  instances_updated INTEGER := 0;
  payrolls_recalculated INTEGER := 0;
  missing_count INTEGER := 0;
  template_is_active BOOLEAN;
  old_template_is_active BOOLEAN;
BEGIN
  -- Deshabilitar RLS PRIMERO
  SET LOCAL row_security = off;
  
  -- Asignar valores a variables locales INMEDIATAMENTE
  template_is_active := NEW.is_active;
  old_template_is_active := OLD.is_active;

  RAISE NOTICE '🔄 Template UPDATE: ID=%, user=%, new_is_active=%, old_is_active=%', 
    NEW.id, NEW.user_id, template_is_active, old_template_is_active;

  -- Si cambió monto o tipo, actualizar instancias existentes
  IF (OLD.amount != NEW.amount OR OLD.expense_type_id != NEW.expense_type_id)
     AND template_is_active = true THEN

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

  -- Verificar y crear instancias faltantes si está activo
  IF template_is_active = true THEN
    RAISE NOTICE '🔍 Verificando instancias faltantes para template %', NEW.id;

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

        PERFORM apply_recurring_expenses_to_user_payroll(
          affected_payroll.user_id,
          affected_payroll.company_payment_period_id
        );
        instances_created := instances_created + 1;

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
$$;

CREATE TRIGGER trigger_sync_recurring_template_on_update
AFTER UPDATE ON expense_recurring_templates
FOR EACH ROW
EXECUTE FUNCTION sync_recurring_template_instances_on_update();


-- Recrear trigger generador de instancias
DROP FUNCTION IF EXISTS generate_recurring_expense_instances_on_template() CASCADE;

CREATE OR REPLACE FUNCTION generate_recurring_expense_instances_on_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_current_date DATE := CURRENT_DATE;
  v_end_date DATE;
  v_period_date DATE;
  v_company_id UUID;
  v_company_payment_period_id UUID;
  v_user_payroll_id UUID;
  v_instance_description TEXT;
  v_deleted_count INTEGER := 0;
  template_is_active BOOLEAN;
BEGIN
  -- Deshabilitar RLS PRIMERO
  SET LOCAL row_security = off;
  
  -- Asignar is_active INMEDIATAMENTE
  template_is_active := NEW.is_active;
  
  RAISE LOG 'generate_recurring_expense_instances: START for template % (user: %, frequency: %, is_active: %)', 
    NEW.id, NEW.user_id, NEW.frequency, template_is_active;
  
  -- Obtener company_id del usuario
  SELECT company_id INTO v_company_id
  FROM user_company_roles
  WHERE user_id = NEW.user_id AND is_active = true
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró empresa activa para el usuario %', NEW.user_id;
  END IF;
  
  -- Determinar fecha límite
  v_end_date := LEAST(COALESCE(NEW.end_date, v_current_date), v_current_date);
  
  RAISE LOG 'generate_recurring_expense_instances: Generating from % to % (company: %)', 
    NEW.start_date, v_end_date, v_company_id;
  
  -- Si es UPDATE, eliminar instancias modificables
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM expense_instances ei
    WHERE ei.user_id = NEW.user_id
      AND ei.expense_type_id = NEW.expense_type_id
      AND ei.payment_period_id IN (
        SELECT up.id FROM user_payrolls up
        WHERE up.user_id = NEW.user_id
          AND up.payment_status != 'paid'
      )
      AND (ei.description LIKE 'Recurring:%' OR ei.description = 'Recurring expense');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE LOG 'generate_recurring_expense_instances: Deleted % modifiable instances', v_deleted_count;
  END IF;
  
  -- Generar períodos si el template está activo
  IF NOT template_is_active THEN
    RAISE LOG 'generate_recurring_expense_instances: Template is inactive, skipping generation';
    RETURN NEW;
  END IF;
  
  v_period_date := NEW.start_date;
  
  WHILE v_period_date <= v_end_date LOOP
    RAISE LOG 'generate_recurring_expense_instances: Processing period %', v_period_date;
    
    BEGIN
      v_company_payment_period_id := create_company_payment_period_if_needed(
        v_company_id,
        v_period_date,
        COALESCE(auth.uid(), NEW.created_by)
      );
      
      RAISE LOG 'generate_recurring_expense_instances: Period ID = %', v_company_payment_period_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating payment period for date %: %', v_period_date, SQLERRM;
      v_period_date := CASE NEW.frequency
        WHEN 'weekly' THEN v_period_date + INTERVAL '7 days'
        WHEN 'biweekly' THEN v_period_date + INTERVAL '14 days'
        WHEN 'monthly' THEN v_period_date + INTERVAL '1 month'
        ELSE v_period_date + INTERVAL '1 month'
      END;
      CONTINUE;
    END;
    
    -- Obtener o crear user_payroll
    SELECT id INTO v_user_payroll_id
    FROM user_payrolls
    WHERE user_id = NEW.user_id
      AND company_payment_period_id = v_company_payment_period_id;
    
    IF v_user_payroll_id IS NULL THEN
      INSERT INTO user_payrolls (
        user_id, company_payment_period_id, company_id,
        gross_earnings, fuel_expenses, total_deductions, other_income,
        net_payment, has_negative_balance, payment_status, calculated_by
      ) VALUES (
        NEW.user_id, v_company_payment_period_id, v_company_id,
        0, 0, 0, 0, 0, false, 'calculated',
        COALESCE(auth.uid(), NEW.created_by)
      ) RETURNING id INTO v_user_payroll_id;
      
      RAISE LOG 'generate_recurring_expense_instances: Created user_payroll %', v_user_payroll_id;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM user_payrolls 
      WHERE id = v_user_payroll_id AND payment_status = 'paid'
    ) THEN
      RAISE LOG 'generate_recurring_expense_instances: Skipping period % - payroll is paid', v_period_date;
      v_period_date := CASE NEW.frequency
        WHEN 'weekly' THEN v_period_date + INTERVAL '7 days'
        WHEN 'biweekly' THEN v_period_date + INTERVAL '14 days'
        WHEN 'monthly' THEN v_period_date + INTERVAL '1 month'
        ELSE v_period_date + INTERVAL '1 month'
      END;
      CONTINUE;
    END IF;
    
    v_instance_description := 'Recurring: ' || 
      (SELECT name FROM expense_types WHERE id = NEW.expense_type_id) || 
      ' (' || NEW.frequency || ')';
    
    IF NOT EXISTS (
      SELECT 1 FROM expense_instances
      WHERE user_id = NEW.user_id
        AND expense_type_id = NEW.expense_type_id
        AND payment_period_id = v_user_payroll_id
        AND recurring_template_id = NEW.id
    ) THEN
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date,
        description, payment_period_id, recurring_template_id, created_by
      ) VALUES (
        NEW.user_id, NEW.expense_type_id, NEW.amount, v_period_date,
        v_instance_description, v_user_payroll_id, NEW.id,
        COALESCE(auth.uid(), NEW.created_by)
      );
      
      RAISE LOG 'generate_recurring_expense_instances: Created instance for period %', v_period_date;
    END IF;
    
    v_period_date := CASE NEW.frequency
      WHEN 'weekly' THEN v_period_date + INTERVAL '7 days'
      WHEN 'biweekly' THEN v_period_date + INTERVAL '14 days'
      WHEN 'monthly' THEN v_period_date + INTERVAL '1 month'
      ELSE v_period_date + INTERVAL '1 month'
    END;
  END LOOP;
  
  RAISE LOG 'generate_recurring_expense_instances: COMPLETED for template %', NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_instances_on_template_change
AFTER INSERT OR UPDATE ON expense_recurring_templates
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION generate_recurring_expense_instances_on_template();