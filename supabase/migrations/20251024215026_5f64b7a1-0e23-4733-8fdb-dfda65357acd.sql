-- Fix generate_recurring_expense_instances_on_template to remove description field
-- The notes field should only be populated manually, not automatically

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
  v_deleted_count INTEGER := 0;
  template_is_active BOOLEAN;
BEGIN
  SET LOCAL row_security = off;
  template_is_active := NEW.is_active;
  
  RAISE LOG 'generate_recurring_expense_instances: START for template % (user: %, frequency: %, is_active: %)', 
    NEW.id, NEW.user_id, NEW.frequency, template_is_active;
  
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
  
  -- Delete existing instances from non-paid periods when updating template
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM expense_instances ei
    WHERE ei.user_id = NEW.user_id
      AND ei.expense_type_id = NEW.expense_type_id
      AND ei.payment_period_id IN (
        SELECT id FROM company_payment_periods cpp
        WHERE cpp.company_id = v_company_id
          AND NOT EXISTS (
            SELECT 1 FROM user_payrolls up
            WHERE up.company_payment_period_id = cpp.id
              AND up.user_id = NEW.user_id
              AND up.payment_status = 'paid'
          )
      )
      AND ei.recurring_template_id = NEW.id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE LOG 'generate_recurring_expense_instances: Deleted % modifiable instances', v_deleted_count;
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
      
      RAISE LOG 'generate_recurring_expense_instances: Company period ID = %', v_company_payment_period_id;
      
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
      
      IF NOT EXISTS (
        SELECT 1 FROM expense_instances
        WHERE user_id = NEW.user_id
          AND expense_type_id = NEW.expense_type_id
          AND payment_period_id = v_company_payment_period_id
          AND recurring_template_id = NEW.id
      ) THEN
        -- CORRECCIÓN: No generar campo description automáticamente
        -- El campo notes debe llenarse manualmente si es necesario
        INSERT INTO expense_instances (
          user_id, expense_type_id, amount, expense_date,
          payment_period_id, recurring_template_id, created_by
        ) VALUES (
          NEW.user_id, NEW.expense_type_id, NEW.amount, v_period_date,
          v_company_payment_period_id, NEW.id,
          COALESCE(auth.uid(), NEW.created_by)
        );
        
        RAISE LOG 'generate_recurring_expense_instances: Created instance for period % with cpp_id %', 
          v_period_date, v_company_payment_period_id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'generate_recurring_expense_instances: Error processing period %: %', v_period_date, SQLERRM;
    END;
    
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