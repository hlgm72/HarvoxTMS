-- ============================================================================
-- FIX: Deshabilitar RLS en apply_recurring_expenses_to_user_payroll
-- ============================================================================

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
BEGIN
  -- ✅ Deshabilitar RLS para evitar conflictos con is_active
  SET LOCAL row_security = off;
  
  -- Obtener el user_payroll.id correcto
  SELECT id INTO user_payroll_id
  FROM user_payrolls
  WHERE user_id = target_user_id
    AND company_payment_period_id = target_period_id;
  
  IF user_payroll_id IS NULL THEN
    RAISE NOTICE '⚠️ No existe user_payroll para user % en period %', target_user_id, target_period_id;
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'No user_payroll found for this user and period',
      'user_id', target_user_id,
      'company_payment_period_id', target_period_id
    );
  END IF;
  
  -- Get period info
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Period not found');
  END IF;
  
  RAISE NOTICE '🔄 Applying recurring expenses for user % in period % (user_payroll: %)', 
    target_user_id, target_period_id, user_payroll_id;
  
  -- Get active recurring templates for this user
  FOR template_record IN
    SELECT ert.*, et.name as expense_type_name
    FROM expense_recurring_templates ert
    JOIN expense_types et ON et.id = ert.expense_type_id
    WHERE ert.user_id = target_user_id
    AND ert.is_active = true
    AND ert.start_date <= period_record.period_end_date
    AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
  LOOP
    -- Check if excluded
    IF EXISTS (
      SELECT 1 FROM recurring_expense_exclusions
      WHERE recurring_template_id = template_record.id
      AND payment_period_id = target_period_id
      AND is_active = true
    ) THEN
      RAISE NOTICE '⏭️ Template % excluded for this period', template_record.id;
      instances_skipped := instances_skipped + 1;
      CONTINUE;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM expense_instances
      WHERE recurring_template_id = template_record.id
      AND payment_period_id = user_payroll_id
      AND user_id = target_user_id
    ) THEN
      RAISE NOTICE '⏭️ Expense instance already exists for template %', template_record.id;
      instances_skipped := instances_skipped + 1;
      CONTINUE;
    END IF;
    
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      user_id,
      amount,
      description,
      expense_date,
      status,
      recurring_template_id,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      user_payroll_id,
      template_record.expense_type_id,
      target_user_id,
      template_record.amount,
      'Recurring expense: ' || template_record.expense_type_name,
      period_record.period_end_date,
      'applied',
      template_record.id,
      template_record.created_by,
      template_record.created_by,
      now()
    );
    
    instances_created := instances_created + 1;
    RAISE NOTICE '✅ Created expense instance for template % (amount: %)', 
      template_record.id, template_record.amount;
  END LOOP;
  
  RAISE NOTICE '✅ Recurring expenses applied: % created, % skipped', 
    instances_created, instances_skipped;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_payroll_id', user_payroll_id,
    'instances_created', instances_created,
    'instances_skipped', instances_skipped,
    'period_start', period_record.period_start_date,
    'period_end', period_record.period_end_date
  );
END;
$function$;