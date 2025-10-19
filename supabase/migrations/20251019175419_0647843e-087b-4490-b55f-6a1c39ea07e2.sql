-- ============================================
-- ACTUALIZACIÓN: REGENERAR TODAS LAS INSTANCIAS AL MODIFICAR PLANTILLA
-- ============================================

CREATE OR REPLACE FUNCTION generate_recurring_expense_instances_on_template()
RETURNS TRIGGER AS $$
DECLARE
  v_current_date DATE := CURRENT_DATE;
  v_end_date DATE;
  v_period_date DATE;
  v_company_id UUID;
  v_company_payment_period_id UUID;
  v_user_payroll_id UUID;
  v_instance_description TEXT;
  v_deleted_count INTEGER := 0;
BEGIN
  RAISE LOG 'generate_recurring_expense_instances: START for template % (user: %, frequency: %)', 
    NEW.id, NEW.user_id, NEW.frequency;
  
  -- Obtener company_id del usuario
  SELECT company_id INTO v_company_id
  FROM user_company_roles
  WHERE user_id = NEW.user_id AND is_active = true
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró empresa activa para el usuario %', NEW.user_id;
  END IF;
  
  -- Determinar fecha límite: nunca generar en el futuro
  v_end_date := LEAST(COALESCE(NEW.end_date, v_current_date), v_current_date);
  
  RAISE LOG 'generate_recurring_expense_instances: Generating from % to % (company: %)', 
    NEW.start_date, v_end_date, v_company_id;
  
  -- Si es UPDATE, eliminar TODAS las instancias (pasadas y futuras) que se puedan modificar
  IF TG_OP = 'UPDATE' THEN
    -- Eliminar todas las instancias de esta plantilla que estén en payrolls no pagados
    DELETE FROM expense_instances ei
    WHERE ei.user_id = NEW.user_id
      AND ei.expense_type_id = NEW.expense_type_id
      AND ei.payment_period_id IN (
        SELECT up.id FROM user_payrolls up
        WHERE up.user_id = NEW.user_id
          AND up.payment_status != 'paid'
      )
      -- Solo eliminar instancias que fueron creadas por esta plantilla (tienen descripción de recurrente)
      AND (ei.description LIKE 'Recurring:%' OR ei.description = 'Recurring expense');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE LOG 'generate_recurring_expense_instances: Deleted % modifiable instances from ALL periods', v_deleted_count;
  END IF;
  
  -- Generar períodos desde start_date hasta end_date (solo pasado/presente)
  v_period_date := NEW.start_date;
  
  WHILE v_period_date <= v_end_date LOOP
    RAISE LOG 'generate_recurring_expense_instances: Processing period %', v_period_date;
    
    -- Crear company_payment_period si no existe
    BEGIN
      v_company_payment_period_id := create_company_payment_period_if_needed(
        v_company_id,
        v_period_date,
        COALESCE(auth.uid(), NEW.created_by)
      );
      
      RAISE LOG 'generate_recurring_expense_instances: Period ID = %', v_company_payment_period_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating payment period for date %: %', v_period_date, SQLERRM;
      -- Avanzar al siguiente período
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
        user_id,
        company_payment_period_id,
        company_id,
        gross_earnings,
        fuel_expenses,
        total_deductions,
        other_income,
        net_payment,
        has_negative_balance,
        payment_status,
        calculated_by
      ) VALUES (
        NEW.user_id,
        v_company_payment_period_id,
        v_company_id,
        0, 0, 0, 0, 0, false,
        'calculated',
        COALESCE(auth.uid(), NEW.created_by)
      ) RETURNING id INTO v_user_payroll_id;
      
      RAISE LOG 'generate_recurring_expense_instances: Created user_payroll %', v_user_payroll_id;
    END IF;
    
    -- Verificar que el payroll no esté pagado antes de crear instancias
    IF EXISTS (
      SELECT 1 FROM user_payrolls 
      WHERE id = v_user_payroll_id AND payment_status = 'paid'
    ) THEN
      RAISE LOG 'generate_recurring_expense_instances: Skipping period % - payroll is paid', v_period_date;
      -- Avanzar al siguiente período
      v_period_date := CASE NEW.frequency
        WHEN 'weekly' THEN v_period_date + INTERVAL '7 days'
        WHEN 'biweekly' THEN v_period_date + INTERVAL '14 days'
        WHEN 'monthly' THEN v_period_date + INTERVAL '1 month'
        ELSE v_period_date + INTERVAL '1 month'
      END;
      CONTINUE;
    END IF;
    
    -- Preparar descripción
    v_instance_description := CASE 
      WHEN NEW.notes IS NOT NULL AND NEW.notes != '' 
      THEN 'Recurring: ' || NEW.notes
      ELSE 'Recurring expense'
    END;
    
    -- Crear instancia si no existe ya (evitar duplicados)
    INSERT INTO expense_instances (
      user_id,
      expense_type_id,
      amount,
      expense_date,
      description,
      payment_period_id,
      created_by
    )
    SELECT
      NEW.user_id,
      NEW.expense_type_id,
      NEW.amount,
      v_period_date,
      v_instance_description,
      v_user_payroll_id,
      COALESCE(auth.uid(), NEW.created_by)
    WHERE NOT EXISTS (
      SELECT 1 FROM expense_instances
      WHERE user_id = NEW.user_id
        AND expense_type_id = NEW.expense_type_id
        AND expense_date = v_period_date
        AND payment_period_id = v_user_payroll_id
    );
    
    IF FOUND THEN
      RAISE LOG 'generate_recurring_expense_instances: Created instance for date %', v_period_date;
      
      -- Recalcular el payroll después de crear la instancia
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error recalculating payroll %: %', v_user_payroll_id, SQLERRM;
      END;
    END IF;
    
    -- Avanzar al siguiente período según frecuencia
    v_period_date := CASE NEW.frequency
      WHEN 'weekly' THEN v_period_date + INTERVAL '7 days'
      WHEN 'biweekly' THEN v_period_date + INTERVAL '14 days'
      WHEN 'monthly' THEN v_period_date + INTERVAL '1 month'
      ELSE v_period_date + INTERVAL '1 month'
    END;
  END LOOP;
  
  RAISE LOG 'generate_recurring_expense_instances: COMPLETED for template % (deleted: %, operation: %)', 
    NEW.id, v_deleted_count, TG_OP;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'generate_recurring_expense_instances: Unexpected error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;