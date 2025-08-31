-- Corregir error en función de recálculo individual de conductor
CREATE OR REPLACE FUNCTION public.recalculate_driver_period_calculation(calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  driver_calc RECORD;
  load_totals RECORD;
  fuel_totals RECORD;
  deduction_totals RECORD;
  other_income_totals RECORD;
  final_net_payment NUMERIC;
  has_negative BOOLEAN := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get the driver calculation record
  SELECT * INTO driver_calc
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo de conductor no encontrado';
  END IF;

  -- Verify user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = driver_calc.company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para recalcular este conductor';
  END IF;

  -- Calculate load totals for this driver in this period
  SELECT 
    COALESCE(SUM(l.total_amount), 0) as gross_earnings
  INTO load_totals
  FROM loads l
  WHERE l.driver_user_id = driver_calc.driver_user_id
    AND l.payment_period_id = driver_calc.id;

  -- Calculate fuel expenses (corregida - usar tabla correcta)
  SELECT 
    COALESCE(SUM(fe.fuel_amount), 0) as fuel_expenses
  INTO fuel_totals
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = driver_calc.driver_user_id
    AND fe.payment_period_id = driver_calc.id;

  -- Calculate deductions
  SELECT 
    COALESCE(SUM(ei.amount), 0) as total_deductions
  INTO deduction_totals
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE ei.payment_period_id = driver_calc.id
    AND ei.user_id = driver_calc.driver_user_id
    AND et.category = 'deduction'
    AND ei.status = 'applied';

  -- Calculate other income
  SELECT 
    COALESCE(SUM(ei.amount), 0) as other_income
  INTO other_income_totals
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE ei.payment_period_id = driver_calc.id
    AND ei.user_id = driver_calc.driver_user_id
    AND et.category = 'income'
    AND ei.status = 'applied';

  -- Calculate final payment
  final_net_payment := COALESCE(load_totals.gross_earnings, 0) 
                    - COALESCE(fuel_totals.fuel_expenses, 0)
                    - COALESCE(deduction_totals.total_deductions, 0) 
                    + COALESCE(other_income_totals.other_income, 0);

  -- Check for negative balance
  has_negative := final_net_payment < 0;

  -- Update the specific driver calculation
  UPDATE driver_period_calculations SET
    gross_earnings = COALESCE(load_totals.gross_earnings, 0),
    fuel_expenses = COALESCE(fuel_totals.fuel_expenses, 0),
    total_deductions = COALESCE(deduction_totals.total_deductions, 0),
    other_income = COALESCE(other_income_totals.other_income, 0),
    total_income = COALESCE(load_totals.gross_earnings, 0) + COALESCE(other_income_totals.other_income, 0),
    net_payment = final_net_payment,
    has_negative_balance = has_negative,
    calculated_at = now(),
    calculated_by = current_user_id,
    updated_at = now()
  WHERE id = calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', driver_calc.driver_user_id,
    'gross_earnings', COALESCE(load_totals.gross_earnings, 0),
    'fuel_expenses', COALESCE(fuel_totals.fuel_expenses, 0),
    'total_deductions', COALESCE(deduction_totals.total_deductions, 0),
    'other_income', COALESCE(other_income_totals.other_income, 0),
    'net_payment', final_net_payment,
    'has_negative_balance', has_negative,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error recalculando conductor: %', SQLERRM;
END;
$function$;