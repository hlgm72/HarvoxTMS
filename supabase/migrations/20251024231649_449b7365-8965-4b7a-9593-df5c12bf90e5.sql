-- Corregir funciones que usan columnas/valores incorrectos

-- 1. Corregir recalculate_user_payroll_complete - usar 'company_driver' en vez de 'driver'
CREATE OR REPLACE FUNCTION recalculate_user_payroll_complete(
  p_driver_user_id UUID,
  p_payment_period_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross_earnings NUMERIC;
  v_other_income NUMERIC;
  v_fuel_expenses NUMERIC;
  v_percentage_deductions NUMERIC;
  v_expense_deductions NUMERIC;
  v_total_deductions NUMERIC;
  v_net_payment NUMERIC;
  v_payroll_id UUID;
  v_company_id UUID;
BEGIN
  RAISE LOG '🔄 recalculate_user_payroll_complete: Iniciando para driver % período %', 
    p_driver_user_id, p_payment_period_id;

  SELECT company_id INTO v_company_id
  FROM company_payment_periods
  WHERE id = p_payment_period_id;

  PERFORM recalculate_period_percentage_deductions(p_payment_period_id, p_driver_user_id);
  
  RAISE LOG '✅ Regeneradas deducciones de porcentaje para driver % período %', 
    p_driver_user_id, p_payment_period_id;

  SELECT COALESCE(SUM(l.total_amount), 0)
  INTO v_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = p_driver_user_id
    AND l.payment_period_id = p_payment_period_id
    AND l.status NOT IN ('cancelled', 'rejected');

  SELECT COALESCE(SUM(
    (l.total_amount * COALESCE(l.factoring_percentage, 0) / 100) +
    (l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100) +
    (l.total_amount * COALESCE(l.leasing_percentage, 0) / 100)
  ), 0)
  INTO v_percentage_deductions
  FROM loads l
  WHERE l.driver_user_id = p_driver_user_id
    AND l.payment_period_id = p_payment_period_id
    AND l.status NOT IN ('cancelled', 'rejected');

  SELECT COALESCE(SUM(oi.amount), 0)
  INTO v_other_income
  FROM other_income oi
  WHERE oi.user_id = p_driver_user_id
    AND oi.payment_period_id = p_payment_period_id;

  SELECT COALESCE(SUM(fe.total_amount), 0)
  INTO v_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = p_driver_user_id
    AND fe.payment_period_id = p_payment_period_id;

  SELECT COALESCE(SUM(ei.amount), 0)
  INTO v_expense_deductions
  FROM expense_instances ei
  WHERE ei.user_id = p_driver_user_id
    AND ei.payment_period_id = p_payment_period_id
    AND ei.status IN ('planned', 'applied')
    AND ei.expense_type_id NOT IN (
      SELECT id FROM expense_types 
      WHERE name IN ('Factoring fees', 'Dispatching fees', 'Leasing fees')
    );

  v_total_deductions := v_percentage_deductions + v_expense_deductions;
  v_net_payment := v_gross_earnings + v_other_income - v_fuel_expenses - v_total_deductions;

  SELECT id INTO v_payroll_id
  FROM user_payrolls
  WHERE user_id = p_driver_user_id
    AND company_payment_period_id = p_payment_period_id;

  IF v_payroll_id IS NOT NULL THEN
    UPDATE user_payrolls
    SET
      gross_earnings = v_gross_earnings,
      other_income = v_other_income,
      fuel_expenses = v_fuel_expenses,
      total_deductions = v_total_deductions,
      net_payment = v_net_payment,
      updated_at = NOW()
    WHERE id = v_payroll_id;
    
    RAISE LOG '✅ Actualizado payroll existente ID: %', v_payroll_id;
  ELSE
    INSERT INTO user_payrolls (
      user_id,
      company_payment_period_id,
      company_id,
      gross_earnings,
      other_income,
      fuel_expenses,
      total_deductions,
      net_payment,
      payroll_role
    ) VALUES (
      p_driver_user_id,
      p_payment_period_id,
      v_company_id,
      v_gross_earnings,
      v_other_income,
      v_fuel_expenses,
      v_total_deductions,
      v_net_payment,
      'company_driver'
    )
    RETURNING id INTO v_payroll_id;
    
    RAISE LOG '✅ Creado nuevo payroll ID: %', v_payroll_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payroll_id', v_payroll_id,
    'gross_earnings', v_gross_earnings,
    'percentage_deductions', v_percentage_deductions,
    'expense_deductions', v_expense_deductions,
    'total_deductions', v_total_deductions,
    'fuel_expenses', v_fuel_expenses,
    'other_income', v_other_income,
    'net_payment', v_net_payment
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ recalculate_user_payroll_complete ERROR: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 2. Corregir auto_assign_payment_period_to_load - eliminar filtro por status
CREATE OR REPLACE FUNCTION public.auto_assign_payment_period_to_load()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_company_id UUID;
  company_criteria TEXT;
  target_date DATE;
  matching_period_id UUID;
BEGIN
  IF NEW.payment_period_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT DISTINCT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = NEW.driver_user_id
    AND ucr.is_active = true
  LIMIT 1;
  
  IF target_company_id IS NULL THEN
    RAISE LOG 'auto_assign_payment_period_to_load: No se pudo determinar company_id para driver %', NEW.driver_user_id;
    RETURN NEW;
  END IF;

  SELECT load_assignment_criteria INTO company_criteria
  FROM companies 
  WHERE id = target_company_id;
  
  IF company_criteria IS NULL THEN
    company_criteria := 'delivery_date';
  END IF;
  
  CASE company_criteria
    WHEN 'pickup_date' THEN
      target_date := NEW.pickup_date;
    WHEN 'assigned_date' THEN
      target_date := NEW.created_at::DATE;
    ELSE
      target_date := NEW.delivery_date;
  END CASE;
  
  IF target_date IS NOT NULL THEN
    SELECT id INTO matching_period_id
    FROM company_payment_periods
    WHERE company_id = target_company_id
      AND period_start_date <= target_date
      AND period_end_date >= target_date
    ORDER BY period_start_date DESC
    LIMIT 1;
    
    IF matching_period_id IS NULL THEN
      matching_period_id := create_payment_period_if_needed(target_company_id, target_date);
    END IF;
    
    IF matching_period_id IS NOT NULL THEN
      NEW.payment_period_id := matching_period_id;
      RAISE LOG 'auto_assign_payment_period_to_load: Asignado período % a carga %', matching_period_id, NEW.load_number;
    END IF;
  END IF;
  
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error en auto_assign_payment_period_to_load: %', SQLERRM;
  RETURN NEW;
END;
$$;