-- Fix column reference in calculate_driver_payment_period_with_validation function
-- Change oi.driver_user_id to oi.user_id in other_income query

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  company_period_record RECORD;
  current_user_id UUID;
  total_gross_earnings NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_deductions NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
  has_negative_balance BOOLEAN := false;
  balance_alert_message TEXT := NULL;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Get the calculation record
  SELECT dpc.*, cpp.company_id, cpp.period_start_date, cpp.period_end_date
  INTO calculation_record, company_period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERROR_CALCULATION_NOT_FOUND';
  END IF;

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = company_period_record.company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_CALCULATE_PAYMENTS';
  END IF;

  -- Calculate gross earnings from loads
  SELECT COALESCE(SUM(l.total_amount), 0) INTO total_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status IN ('completed', 'invoiced');

  -- Calculate fuel expenses 
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = calculation_record.id;

  -- Calculate other income - FIX: Use correct column name
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = calculation_record.id;

  -- Calculate deductions from expense instances
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = calculation_record.id
  AND ei.status = 'applied';

  -- Calculate net payment
  calculated_net_payment := total_gross_earnings + total_other_income - total_fuel_expenses - total_deductions;

  -- Check for negative balance
  IF calculated_net_payment < 0 THEN
    has_negative_balance := true;
    balance_alert_message := 'Saldo negativo: Las deducciones y gastos superan las ganancias brutas';
  END IF;

  -- Update the calculation record
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_gross_earnings,
    fuel_expenses = total_fuel_expenses,
    other_income = total_other_income,
    total_deductions = total_deductions,
    total_income = total_gross_earnings + total_other_income,
    net_payment = calculated_net_payment,
    has_negative_balance = has_negative_balance,
    balance_alert_message = balance_alert_message,
    calculated_by = current_user_id,
    calculated_at = now(),
    updated_at = now()
  WHERE id = calculation_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'gross_earnings', total_gross_earnings,
    'fuel_expenses', total_fuel_expenses,
    'other_income', total_other_income,
    'total_deductions', total_deductions,
    'total_income', total_gross_earnings + total_other_income,
    'net_payment', calculated_net_payment,
    'has_negative_balance', has_negative_balance,
    'balance_alert_message', balance_alert_message,
    'calculated_by', current_user_id,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_CALCULATION_FAILED: %', SQLERRM;
END;
$function$