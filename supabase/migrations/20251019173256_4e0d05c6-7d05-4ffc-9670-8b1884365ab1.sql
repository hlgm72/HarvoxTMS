-- ============================================================================
-- FIX: apply_recurring_expenses debe crear company_payment_period automáticamente
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
  v_company_id UUID;
  v_created_period_id UUID;
BEGIN
  SET LOCAL row_security = off;
  
  -- Obtener company_id del usuario
  SELECT company_id INTO v_company_id
  FROM user_company_roles
  WHERE user_id = target_user_id
    AND is_active = true
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User has no active company'
    );
  END IF;
  
  -- ✅ NUEVO: Verificar si el período existe, si no, crearlo automáticamente
  SELECT id INTO v_created_period_id
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF v_created_period_id IS NULL THEN
    -- El período no existe, intentar crearlo usando la fecha actual
    SELECT create_company_payment_period_if_needed(
      v_company_id,
      CURRENT_DATE,
      auth.uid()
    ) INTO v_created_period_id;
    
    IF v_created_period_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Could not create payment period'
      );
    END IF;
    
    RAISE NOTICE '✅ Created company_payment_period % for company %', 
      v_created_period_id, v_company_id;
    
    -- Actualizar el target_period_id con el nuevo período creado
    target_period_id := v_created_period_id;
  END IF;
  
  -- Obtener información del período (ahora garantizado que existe)
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Period not found after creation');
  END IF;
  
  -- ⚠️ VALIDACIÓN: No crear instancias para períodos futuros
  IF period_record.period_start_date > CURRENT_DATE THEN
    RAISE NOTICE '⏭️ Cannot create instances for future periods (period starts: %)', period_record.period_start_date;
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Cannot create expense instances for future periods',
      'period_start_date', period_record.period_start_date
    );
  END IF;
  
  -- Obtener o crear user_payroll
  SELECT id INTO user_payroll_id
  FROM user_payrolls
  WHERE user_id = target_user_id
    AND company_payment_period_id = target_period_id;
  
  -- Si no existe, CREAR el user_payroll automáticamente
  IF user_payroll_id IS NULL THEN
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
      status,
      calculated_by
    ) VALUES (
      target_user_id,
      target_period_id,
      v_company_id,
      0, 0, 0, 0, 0, false,
      'calculated',
      'open',
      auth.uid()
    ) RETURNING id INTO user_payroll_id;
    
    RAISE NOTICE '✅ Created user_payroll % for user % in period %', 
      user_payroll_id, target_user_id, target_period_id;
  END IF;
  
  -- ⚠️ VALIDACIÓN: No modificar payrolls ya pagados
  IF EXISTS (
    SELECT 1 FROM user_payrolls
    WHERE id = user_payroll_id
      AND payment_status = 'paid'
  ) THEN
    RAISE NOTICE '⏭️ Cannot modify paid payroll %', user_payroll_id;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot modify paid payroll',
      'user_payroll_id', user_payroll_id
    );
  END IF;
  
  RAISE NOTICE '🔄 Applying recurring expenses for user % in period % (user_payroll: %)', 
    target_user_id, target_period_id, user_payroll_id;
  
  -- Obtener templates activos para este usuario
  FOR template_record IN
    SELECT ert.*, et.name as expense_type_name
    FROM expense_recurring_templates ert
    JOIN expense_types et ON et.id = ert.expense_type_id
    WHERE ert.user_id = target_user_id
    AND ert.is_active = true
    AND ert.start_date <= period_record.period_end_date
    AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
  LOOP
    -- Verificar si está excluido
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
    
    -- Verificar si ya existe la instancia
    IF EXISTS (
      SELECT 1 FROM expense_instances
      WHERE recurring_template_id = template_record.id
      AND payment_period_id = target_period_id
      AND user_id = target_user_id
    ) THEN
      RAISE NOTICE '⏭️ Expense instance already exists for template %', template_record.id;
      instances_skipped := instances_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Crear la instancia
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
      target_period_id,
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

COMMENT ON FUNCTION public.apply_recurring_expenses_to_user_payroll IS 
'Aplica deducciones recurrentes a un payroll específico. 
✅ Crea el company_payment_period automáticamente si no existe
✅ Crea el user_payroll automáticamente si no existe
✅ Valida que no sea un período futuro
✅ Valida que el payroll no esté pagado';