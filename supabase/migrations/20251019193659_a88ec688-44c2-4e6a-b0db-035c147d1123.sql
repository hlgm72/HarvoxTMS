-- Función auxiliar para calcular la semana del mes de una fecha
CREATE OR REPLACE FUNCTION get_week_of_month(check_date date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Calcula qué semana del mes es basándose en el día del mes
  -- Semana 1: días 1-7, Semana 2: días 8-14, etc.
  RETURN CEIL(EXTRACT(DAY FROM check_date)::numeric / 7);
END;
$$;

-- Corregir apply_recurring_expenses_to_user_payroll para verificar month_week
CREATE OR REPLACE FUNCTION public.apply_recurring_expenses_to_user_payroll(
  target_user_id uuid, 
  target_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  template_record RECORD;
  period_record RECORD;
  user_payroll_id UUID;
  instances_created INTEGER := 0;
  instances_skipped INTEGER := 0;
  v_company_id UUID;
  v_created_period_id UUID;
  template_is_active BOOLEAN;
  period_week_of_month INTEGER;
BEGIN
  SET LOCAL row_security = off;
  
  SELECT company_id INTO v_company_id
  FROM user_company_roles
  WHERE user_id = target_user_id AND is_active = true
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User has no active company');
  END IF;
  
  SELECT id INTO v_created_period_id
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF v_created_period_id IS NULL THEN
    SELECT create_company_payment_period_if_needed(v_company_id, CURRENT_DATE, auth.uid()) 
    INTO v_created_period_id;
    
    IF v_created_period_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Could not create payment period');
    END IF;
    
    target_period_id := v_created_period_id;
  END IF;
  
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Period not found');
  END IF;
  
  IF period_record.period_start_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Cannot create expense instances for future periods'
    );
  END IF;
  
  -- ✅ Calcular la semana del mes del período (usando la fecha de inicio)
  period_week_of_month := get_week_of_month(period_record.period_start_date);
  
  SELECT id INTO user_payroll_id
  FROM user_payrolls
  WHERE user_id = target_user_id AND company_payment_period_id = target_period_id;
  
  IF user_payroll_id IS NULL THEN
    INSERT INTO user_payrolls (
      user_id, company_payment_period_id, company_id,
      gross_earnings, fuel_expenses, total_deductions, other_income,
      net_payment, has_negative_balance, payment_status, calculated_by
    ) VALUES (
      target_user_id, target_period_id, v_company_id,
      0, 0, 0, 0, 0, false, 'calculated', auth.uid()
    ) RETURNING id INTO user_payroll_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_payrolls
    WHERE id = user_payroll_id AND payment_status = 'paid'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot modify paid payroll');
  END IF;
  
  FOR template_record IN
    SELECT ert.*, et.name as expense_type_name
    FROM expense_recurring_templates ert
    JOIN expense_types et ON et.id = ert.expense_type_id
    WHERE ert.user_id = target_user_id
    AND ert.start_date <= period_record.period_end_date
    AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
  LOOP
    template_is_active := template_record.is_active;
    
    IF NOT template_is_active THEN
      instances_skipped := instances_skipped + 1;
      CONTINUE;
    END IF;
    
    -- ✅ NUEVO: Verificar month_week para gastos mensuales
    IF template_record.frequency = 'monthly' AND template_record.month_week IS NOT NULL THEN
      IF template_record.month_week != period_week_of_month THEN
        instances_skipped := instances_skipped + 1;
        RAISE LOG 'Skipping template % (%) - month_week % does not match period week %',
          template_record.id, template_record.expense_type_name, 
          template_record.month_week, period_week_of_month;
        CONTINUE;
      END IF;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM recurring_expense_exclusions
      WHERE recurring_template_id = template_record.id
      AND payment_period_id = target_period_id
    ) THEN
      instances_skipped := instances_skipped + 1;
      CONTINUE;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM expense_instances
      WHERE recurring_template_id = template_record.id
      AND payment_period_id = target_period_id
      AND user_id = target_user_id
    ) THEN
      instances_skipped := instances_skipped + 1;
      CONTINUE;
    END IF;
    
    INSERT INTO expense_instances (
      payment_period_id, expense_type_id, user_id, amount,
      description, expense_date, recurring_template_id, created_by
    ) VALUES (
      target_period_id, template_record.expense_type_id, target_user_id, template_record.amount,
      'Recurring: ' || template_record.expense_type_name,
      period_record.period_end_date, template_record.id, template_record.created_by
    );
    
    instances_created := instances_created + 1;
    
    RAISE LOG 'Created instance for template % (%) in period week % of month',
      template_record.id, template_record.expense_type_name, period_week_of_month;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_payroll_id', user_payroll_id,
    'period_week_of_month', period_week_of_month,
    'instances_created', instances_created,
    'instances_skipped', instances_skipped
  );
END;
$function$;