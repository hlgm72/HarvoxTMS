-- Fix user_payrolls INSERT to remove non-existent has_negative_balance column

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
  v_period_week_of_month INTEGER;
  v_affected_payrolls UUID[];
  v_period_start_date DATE;
BEGIN
  SET LOCAL row_security = off;
  
  template_is_active := NEW.is_active;
  
  RAISE LOG 'generate_recurring_expense_instances: START for template % (user: %, frequency: %, is_active: %, month_week: %)', 
    NEW.id, NEW.user_id, NEW.frequency, template_is_active, NEW.month_week;
  
  SELECT company_id INTO v_company_id
  FROM user_company_roles
  WHERE user_id = NEW.user_id AND is_active = true
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró empresa activa para el usuario %', NEW.user_id;
  END IF;
  
  v_end_date := LEAST(COALESCE(NEW.end_date, v_current_date), v_current_date);
  
  RAISE LOG 'generate_recurring_expense_instances: Generating from % to % (company: %)', 
    NEW.start_date, v_end_date, v_company_id;
  
  IF TG_OP = 'UPDATE' THEN
    SELECT ARRAY_AGG(DISTINCT up.id) INTO v_affected_payrolls
    FROM expense_instances ei
    JOIN user_payrolls up ON up.company_payment_period_id = ei.payment_period_id
    WHERE ei.user_id = NEW.user_id
      AND ei.recurring_template_id = NEW.id
      AND up.user_id = NEW.user_id
      AND up.payment_status != 'paid';
    
    DELETE FROM expense_instances ei
    WHERE ei.user_id = NEW.user_id
      AND ei.recurring_template_id = NEW.id
      AND ei.payment_period_id IN (
        SELECT cpp.id FROM company_payment_periods cpp
        JOIN user_payrolls up ON up.company_payment_period_id = cpp.id
        WHERE up.user_id = NEW.user_id
          AND up.payment_status != 'paid'
      );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE LOG 'generate_recurring_expense_instances: Deleted % instances from template %', 
      v_deleted_count, NEW.id;
    
    IF v_affected_payrolls IS NOT NULL AND array_length(v_affected_payrolls, 1) > 0 THEN
      DECLARE
        payroll_id UUID;
        recalc_count INTEGER := 0;
      BEGIN
        FOREACH payroll_id IN ARRAY v_affected_payrolls
        LOOP
          BEGIN
            PERFORM calculate_user_payment_period_with_validation(payroll_id);
            recalc_count := recalc_count + 1;
            RAISE LOG '✅ Recalculado payroll % después de eliminar instancias', payroll_id;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ Error recalculando payroll %: %', payroll_id, SQLERRM;
          END;
        END LOOP;
        RAISE LOG '✅ Recalculados % payrolls después de eliminar instancias', recalc_count;
      END;
    END IF;
  END IF;
  
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
    
    IF NEW.frequency = 'monthly' AND NEW.month_week IS NOT NULL THEN
      SELECT period_start_date INTO v_period_start_date
      FROM company_payment_periods
      WHERE id = v_company_payment_period_id;
      
      v_period_week_of_month := get_week_of_month(v_period_start_date);
      
      IF v_period_week_of_month != NEW.month_week THEN
        RAISE LOG '⏭️ Skipping period % - week % does not match template month_week %', 
          v_period_start_date, v_period_week_of_month, NEW.month_week;
        
        v_period_date := CASE NEW.frequency
          WHEN 'weekly' THEN v_period_date + INTERVAL '7 days'
          WHEN 'biweekly' THEN v_period_date + INTERVAL '14 days'
          WHEN 'monthly' THEN v_period_date + INTERVAL '1 month'
          ELSE v_period_date + INTERVAL '1 month'
        END;
        CONTINUE;
      ELSE
        RAISE LOG '✅ Period % is in week % of month, matches template month_week %', 
          v_period_start_date, v_period_week_of_month, NEW.month_week;
      END IF;
    END IF;
    
    SELECT id INTO v_user_payroll_id
    FROM user_payrolls
    WHERE user_id = NEW.user_id
      AND company_payment_period_id = v_company_payment_period_id;
    
    IF v_user_payroll_id IS NULL THEN
      -- ✅ FIXED: Removed has_negative_balance column
      INSERT INTO user_payrolls (
        user_id, company_payment_period_id, company_id,
        gross_earnings, fuel_expenses, total_deductions, other_income,
        net_payment, payment_status, calculated_by, payroll_role
      ) VALUES (
        NEW.user_id, v_company_payment_period_id, v_company_id,
        0, 0, 0, 0, 0, 'calculated',
        COALESCE(auth.uid(), NEW.created_by), 'company_driver'
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
      CASE 
        WHEN NEW.frequency = 'monthly' AND NEW.month_week IS NOT NULL 
        THEN ' (monthly - week ' || NEW.month_week || ')'
        ELSE ' (' || NEW.frequency || ')'
      END;
    
    IF NOT EXISTS (
      SELECT 1 FROM expense_instances
      WHERE user_id = NEW.user_id
        AND expense_type_id = NEW.expense_type_id
        AND payment_period_id = v_company_payment_period_id
        AND recurring_template_id = NEW.id
    ) THEN
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date,
        description, payment_period_id, recurring_template_id, created_by
      ) VALUES (
        NEW.user_id, NEW.expense_type_id, NEW.amount, v_period_date,
        v_instance_description, v_company_payment_period_id, NEW.id,
        COALESCE(auth.uid(), NEW.created_by)
      );
      
      RAISE LOG 'generate_recurring_expense_instances: Created instance for period % (week %)', 
        v_period_date, v_period_week_of_month;
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

COMMENT ON FUNCTION generate_recurring_expense_instances_on_template IS 
'Genera instancias de gastos recurrentes - versión corregida sin has_negative_balance';