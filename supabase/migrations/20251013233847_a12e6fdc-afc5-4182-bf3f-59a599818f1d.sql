
-- 🚨 CORRECCIÓN CRÍTICA: Incluir transacciones de combustible 'pending' en los cálculos de payroll
-- Problema: Las transacciones con status='pending' no se estaban contabilizando en fuel_expenses
-- Solución: Incluir tanto 'approved' como 'pending', excluir solo 'rejected'

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
  
  -- ✅ CORREGIDO: Calcular total de cargas SIN filtrar por estado (excepto cancelled)
  -- Las cargas asignadas deben contar en el payroll desde el momento de asignación
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_loads
  FROM loads
  WHERE driver_user_id = v_calculation.user_id
  AND payment_period_id = v_calculation.company_payment_period_id
  AND status != 'cancelled';
  
  -- 🚨 CRÍTICO CORREGIDO: Incluir transacciones 'pending' Y 'approved' en el cálculo de combustible
  -- Las transacciones 'pending' representan gastos reales que deben descontarse
  -- Solo excluimos las 'rejected' porque fueron rechazadas
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_fuel
  FROM fuel_expenses
  WHERE driver_user_id = v_calculation.user_id
  AND payment_period_id = v_calculation.company_payment_period_id
  AND status IN ('approved', 'pending');
  
  -- ✅ CORREGIDO: Calcular total de deducciones usando company_payment_period_id
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
  FROM expense_instances
  WHERE user_id = v_calculation.user_id
  AND payment_period_id = v_calculation.company_payment_period_id;
  
  -- Calcular otros ingresos (si los hay)
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
    'updated_at', now()
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error recalculating payment period: %', SQLERRM;
END;
$$;

-- 🔄 Recalcular el payroll de Diosvani para que refleje el cambio
-- Payroll ID: 070bdab0-179e-4540-96e0-5496c6dbd11f
SELECT calculate_user_payment_period_with_validation('070bdab0-179e-4540-96e0-5496c6dbd11f');
