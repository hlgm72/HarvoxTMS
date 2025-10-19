-- 🚨 CORRECCIÓN CRÍTICA: Sistema de Deducciones Recurrentes v2.0
-- Problema: generate_recurring_expenses_for_period usa tabla obsoleta driver_period_calculations
-- Solución: Actualizar para usar user_payrolls y aplicar automáticamente con triggers

-- ============================================================================
-- 1. ACTUALIZAR generate_recurring_expenses_for_period para usar user_payrolls
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  template_record RECORD;
  user_payroll_record RECORD;
  instances_created INTEGER := 0;
  instances_skipped INTEGER := 0;
  errors_encountered INTEGER := 0;
BEGIN
  -- Get period information
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment period not found'
    );
  END IF;
  
  RAISE NOTICE '🔄 generate_recurring_expenses: Processing period % (% to %)', 
    period_id, period_record.period_start_date, period_record.period_end_date;
  
  -- Get all active recurring expense templates for users in this company
  FOR template_record IN
    SELECT ert.*, ucr.user_id, ucr.company_id
    FROM expense_recurring_templates ert
    JOIN user_company_roles ucr ON ert.user_id = ucr.user_id
    WHERE ucr.company_id = period_record.company_id
    AND ucr.is_active = true
    AND ert.is_active = true
    AND ert.start_date <= period_record.period_end_date
    AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
  LOOP
    BEGIN
      -- 🔍 Check if this template is excluded for this period
      IF EXISTS (
        SELECT 1 FROM recurring_expense_exclusions
        WHERE recurring_template_id = template_record.id
        AND payment_period_id = period_id
        AND is_active = true
      ) THEN
        RAISE NOTICE '⏭️ Skipping excluded template % for period %', template_record.id, period_id;
        instances_skipped := instances_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Get user_payroll for this user and period
      SELECT * INTO user_payroll_record
      FROM user_payrolls
      WHERE user_id = template_record.user_id
      AND company_payment_period_id = period_id
      LIMIT 1;
      
      IF NOT FOUND THEN
        RAISE NOTICE '⚠️ No user_payroll found for user % in period %', template_record.user_id, period_id;
        instances_skipped := instances_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Check if expense instance already exists for this template and user_payroll
      IF EXISTS (
        SELECT 1 FROM expense_instances
        WHERE recurring_template_id = template_record.id
        AND payment_period_id = period_id
        AND user_id = template_record.user_id
      ) THEN
        RAISE NOTICE '⏭️ Expense instance already exists for template % in period %', template_record.id, period_id;
        instances_skipped := instances_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Create expense instance
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
      )
      SELECT 
        period_id,  -- ✅ CORREGIDO: usar company_payment_period_id directamente
        template_record.expense_type_id,
        template_record.user_id,
        template_record.amount,
        'Recurring expense: ' || COALESCE(et.name, 'Unknown'),
        period_record.period_end_date,
        'applied',
        template_record.id,
        template_record.created_by,
        template_record.created_by,
        now()
      FROM expense_types et 
      WHERE et.id = template_record.expense_type_id;
      
      instances_created := instances_created + 1;
      RAISE NOTICE '✅ Created recurring expense instance for template % (amount: %)', 
        template_record.id, template_record.amount;
        
    EXCEPTION WHEN OTHERS THEN
      errors_encountered := errors_encountered + 1;
      RAISE NOTICE '❌ Error creating expense instance for template %: %', template_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '🎉 Recurring expenses generation complete: % created, % skipped, % errors',
    instances_created, instances_skipped, errors_encountered;
  
  RETURN jsonb_build_object(
    'success', true,
    'period_id', period_id,
    'instances_created', instances_created,
    'instances_skipped', instances_skipped,
    'errors_encountered', errors_encountered,
    'message', format('Generated %s recurring expenses, skipped %s existing, %s errors', 
                     instances_created, instances_skipped, errors_encountered)
  );
END;
$function$;

-- ============================================================================
-- 2. CREAR función auxiliar para aplicar deducciones recurrentes a un user_payroll específico
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
  instances_created INTEGER := 0;
  instances_skipped INTEGER := 0;
BEGIN
  -- Get period info
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Period not found');
  END IF;
  
  RAISE NOTICE '🔄 Applying recurring expenses for user % in period %', target_user_id, target_period_id;
  
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
    
    -- Check if already exists
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
    
    -- Create expense instance
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
    RAISE NOTICE '✅ Created recurring expense for template %', template_record.id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'instances_created', instances_created,
    'instances_skipped', instances_skipped
  );
END;
$function$;

-- ============================================================================
-- 3. CREAR trigger para aplicar deducciones recurrentes automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_apply_recurring_expenses_on_payroll_create()
RETURNS TRIGGER AS $$
DECLARE
  apply_result jsonb;
BEGIN
  RAISE NOTICE '🎯 Trigger: Applying recurring expenses to new user_payroll % for user % in period %',
    NEW.id, NEW.user_id, NEW.company_payment_period_id;
  
  -- Apply recurring expenses for this specific user and period
  SELECT apply_recurring_expenses_to_user_payroll(NEW.user_id, NEW.company_payment_period_id)
  INTO apply_result;
  
  RAISE NOTICE '✅ Recurring expenses applied: %', apply_result;
  
  -- Recalculate the payroll to include the new deductions
  PERFORM calculate_user_payment_period_with_validation(NEW.id);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Error applying recurring expenses on payroll create: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_apply_recurring_expenses_on_user_payroll_insert ON user_payrolls;

CREATE TRIGGER trigger_apply_recurring_expenses_on_user_payroll_insert
  AFTER INSERT ON user_payrolls
  FOR EACH ROW
  EXECUTE FUNCTION trigger_apply_recurring_expenses_on_payroll_create();

-- ============================================================================
-- 4. ACTUALIZAR calculate_user_payment_period_with_validation
--    para asegurar que incluye deducciones recurrentes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_user_payment_period_with_validation(
  calculation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_calculation RECORD;
  v_period RECORD;
  v_total_loads NUMERIC := 0;
  v_total_fuel NUMERIC := 0;
  v_total_deductions NUMERIC := 0;
  v_other_income NUMERIC := 0;
  v_result JSONB;
  v_apply_result JSONB;
BEGIN
  -- Obtener el cálculo
  SELECT * INTO v_calculation
  FROM user_payrolls
  WHERE id = calculation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calculation not found: %', calculation_id;
  END IF;
  
  -- Obtener el período
  SELECT * INTO v_period
  FROM company_payment_periods
  WHERE id = v_calculation.company_payment_period_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment period not found';
  END IF;
  
  -- ✅ NUEVO: Asegurar que las deducciones recurrentes están aplicadas
  SELECT apply_recurring_expenses_to_user_payroll(v_calculation.user_id, v_calculation.company_payment_period_id)
  INTO v_apply_result;
  
  RAISE NOTICE '✅ Recurring expenses verification: %', v_apply_result;
  
  -- Calcular total de cargas (excepto cancelled)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_loads
  FROM loads
  WHERE driver_user_id = v_calculation.user_id
  AND payment_period_id = v_calculation.company_payment_period_id
  AND status != 'cancelled';
  
  -- Calcular total de combustible (pending y approved)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_fuel
  FROM fuel_expenses
  WHERE driver_user_id = v_calculation.user_id
  AND payment_period_id = v_calculation.company_payment_period_id
  AND status IN ('approved', 'pending');
  
  -- ✅ Calcular total de deducciones (incluyendo recurrentes)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
  FROM expense_instances
  WHERE user_id = v_calculation.user_id
  AND payment_period_id = v_calculation.company_payment_period_id;
  
  -- Calcular otros ingresos
  v_other_income := COALESCE(v_calculation.other_income, 0);
  
  -- Actualizar el cálculo
  UPDATE user_payrolls
  SET
    gross_earnings = v_total_loads,
    fuel_expenses = v_total_fuel,
    total_deductions = v_total_deductions,
    other_income = v_other_income,
    net_payment = (v_total_loads + v_other_income) - (v_total_fuel + v_total_deductions),
    has_negative_balance = ((v_total_loads + v_other_income) - (v_total_fuel + v_total_deductions)) < 0,
    updated_at = now()
  WHERE id = calculation_id;
  
  -- Construir resultado
  v_result := jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'gross_earnings', v_total_loads,
    'fuel_expenses', v_total_fuel,
    'total_deductions', v_total_deductions,
    'other_income', v_other_income,
    'net_payment', (v_total_loads + v_other_income) - (v_total_fuel + v_total_deductions),
    'updated_at', now(),
    'recurring_expenses_applied', v_apply_result
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error recalculating payment period: %', SQLERRM;
END;
$$;