
-- Actualizar la función de recálculo para regenerar deducciones de porcentaje
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

  -- Obtener company_id del período
  SELECT company_id INTO v_company_id
  FROM company_payment_periods
  WHERE id = p_payment_period_id;

  -- ⭐ PASO CRÍTICO: Regenerar las deducciones de porcentaje desde las cargas
  -- Esto actualiza/crea los expense_instances basados en los porcentajes actuales
  PERFORM recalculate_period_percentage_deductions(p_payment_period_id, p_driver_user_id);
  
  RAISE LOG '✅ Regeneradas deducciones de porcentaje para driver % período %', 
    p_driver_user_id, p_payment_period_id;

  -- 1. Calcular gross_earnings (suma de total_amount de loads)
  SELECT COALESCE(SUM(l.total_amount), 0)
  INTO v_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = p_driver_user_id
    AND l.payment_period_id = p_payment_period_id
    AND l.status NOT IN ('cancelled', 'rejected');

  -- 2. Calcular deducciones de porcentaje de las cargas
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

  -- 3. Calcular other_income
  SELECT COALESCE(SUM(oi.amount), 0)
  INTO v_other_income
  FROM other_income oi
  WHERE oi.user_id = p_driver_user_id
    AND oi.payment_period_id = p_payment_period_id;

  -- 4. Calcular fuel_expenses
  SELECT COALESCE(SUM(fe.total_amount), 0)
  INTO v_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = p_driver_user_id
    AND fe.payment_period_id = p_payment_period_id;

  -- 5. Calcular expense_deductions (deducciones adicionales NO porcentuales)
  -- Ahora solo suma las que NO son porcentajes (las de porcentaje ya se cuentan en v_percentage_deductions)
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

  -- 6. Total deducciones = porcentajes + expenses (sin duplicar las de porcentaje)
  v_total_deductions := v_percentage_deductions + v_expense_deductions;

  -- 7. Calcular net_payment
  v_net_payment := v_gross_earnings + v_other_income - v_fuel_expenses - v_total_deductions;

  -- 8. Actualizar o crear el registro en user_payrolls
  SELECT id INTO v_payroll_id
  FROM user_payrolls
  WHERE user_id = p_driver_user_id
    AND company_payment_period_id = p_payment_period_id;

  IF v_payroll_id IS NOT NULL THEN
    -- Actualizar registro existente
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
    -- Crear nuevo registro
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
      'driver'
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

-- Ejecutar recálculo del período afectado
SELECT force_recalculate_period('becd3770-526a-41cc-8e1e-eb35764c90ac');
