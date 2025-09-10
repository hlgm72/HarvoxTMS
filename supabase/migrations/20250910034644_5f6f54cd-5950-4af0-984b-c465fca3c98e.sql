-- Fix ALL ambiguous column references in calculate_driver_payment_period_with_validation
-- Rename all local variables that conflict with table column names to avoid ambiguity

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  target_company_id UUID;
  period_start_date DATE;
  period_end_date DATE;
  current_user_id UUID;
  calculated_gross_earnings NUMERIC := 0;     -- FIX: Renamed from total_gross_earnings
  calculated_fuel_expenses NUMERIC := 0;      -- FIX: Renamed from total_fuel_expenses
  calculated_other_income NUMERIC := 0;       -- FIX: Renamed from total_other_income
  calculated_total_deductions NUMERIC := 0;   -- Already fixed
  calculated_net_payment NUMERIC := 0;        -- Already renamed
  calculated_has_negative_balance BOOLEAN := false;  -- FIX: Renamed from has_negative_balance
  balance_alert_message TEXT := NULL;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Get the calculation record
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERROR_CALCULATION_NOT_FOUND';
  END IF;

  -- Get company payment period details
  SELECT cpp.company_id, cpp.period_start_date, cpp.period_end_date
  INTO target_company_id, period_start_date, period_end_date
  FROM company_payment_periods cpp
  WHERE cpp.id = calculation_record.company_payment_period_id;

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_CALCULATE_PAYMENTS';
  END IF;

  -- Calculate gross earnings from loads - FIX: Use renamed variable
  SELECT COALESCE(SUM(l.total_amount), 0) INTO calculated_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status IN ('completed', 'invoiced');

  -- Calculate fuel expenses - FIX: Use renamed variable
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO calculated_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = calculation_record.id;

  -- Calculate other income - FIX: Use renamed variable
  SELECT COALESCE(SUM(oi.amount), 0) INTO calculated_other_income
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = calculation_record.id;

  -- Calculate deductions from expense instances
  SELECT COALESCE(SUM(ei.amount), 0) INTO calculated_total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = calculation_record.id
  AND ei.status = 'applied';

  -- Calculate net payment - FIX: Use all renamed variables
  calculated_net_payment := calculated_gross_earnings + calculated_other_income - calculated_fuel_expenses - calculated_total_deductions;

  -- Check for negative balance - FIX: Use renamed variable
  IF calculated_net_payment < 0 THEN
    calculated_has_negative_balance := true;
    balance_alert_message := 'Saldo negativo: Las deducciones y gastos superan las ganancias brutas';
  END IF;

  -- Update the calculation record - FIX: Use explicit column names and renamed variables
  UPDATE driver_period_calculations
  SET 
    gross_earnings = calculated_gross_earnings,
    fuel_expenses = calculated_fuel_expenses,
    other_income = calculated_other_income,
    total_deductions = calculated_total_deductions,
    total_income = calculated_gross_earnings + calculated_other_income,
    net_payment = calculated_net_payment,
    has_negative_balance = calculated_has_negative_balance,
    balance_alert_message = balance_alert_message,
    calculated_by = current_user_id,
    calculated_at = now(),
    updated_at = now()
  WHERE id = calculation_id;

  -- Return success result - FIX: Use all renamed variables
  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'gross_earnings', calculated_gross_earnings,
    'fuel_expenses', calculated_fuel_expenses,
    'other_income', calculated_other_income,
    'total_deductions', calculated_total_deductions,
    'total_income', calculated_gross_earnings + calculated_other_income,
    'net_payment', calculated_net_payment,
    'has_negative_balance', calculated_has_negative_balance,
    'balance_alert_message', balance_alert_message,
    'calculated_by', current_user_id,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_CALCULATION_FAILED: %', SQLERRM;
END;
$function$;