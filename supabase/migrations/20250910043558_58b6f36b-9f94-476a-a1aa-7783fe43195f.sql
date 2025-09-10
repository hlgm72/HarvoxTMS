-- Fix ambiguous column reference in calculate_driver_payment_period_with_validation function
-- The issue is in the UPDATE statement where local variables have the same name as table columns

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calculation_record RECORD;
  total_gross_earnings NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  balance_alert TEXT := NULL;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get the calculation record with period info
  SELECT 
    dpc.*,
    cpp.company_id,
    cpp.period_start_date,
    cpp.period_end_date,
    cpp.is_locked
  INTO calculation_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo de conductor no encontrado';
  END IF;

  -- Check if period is locked
  IF calculation_record.is_locked THEN
    RAISE EXCEPTION 'ERROR_PERIOD_LOCKED:message:No se puede recalcular un período bloqueado';
  END IF;

  -- Validate user has access to this calculation
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = calculation_record.company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) AND current_user_id != calculation_record.driver_user_id THEN
    RAISE EXCEPTION 'Sin permisos para recalcular este período de conductor';
  END IF;

  -- Calculate gross earnings from loads in this period
  SELECT COALESCE(SUM(l.total_amount), 0)
  INTO total_gross_earnings
  FROM loads l
  JOIN load_stops ls ON l.id = ls.load_id
  WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.status IN ('assigned', 'in_transit', 'delivered', 'completed')
    AND ls.stop_type = 'pickup'
    AND ls.scheduled_date BETWEEN calculation_record.period_start_date AND calculation_record.period_end_date;

  -- Calculate fuel expenses from this period
  SELECT COALESCE(SUM(fe.total_amount), 0)
  INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.transaction_date BETWEEN calculation_record.period_start_date AND calculation_record.period_end_date;

  -- Calculate other income from this period
  SELECT COALESCE(SUM(oi.amount), 0)
  INTO total_other_income
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
    AND oi.income_date BETWEEN calculation_record.period_start_date AND calculation_record.period_end_date
    AND oi.status = 'approved';

  -- Calculate total deductions from expense instances
  SELECT COALESCE(SUM(ei.amount), 0)
  INTO total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = calculation_id
    AND ei.user_id = calculation_record.driver_user_id
    AND ei.status = 'applied';

  -- Calculate totals
  total_income := total_gross_earnings + total_other_income;
  net_payment := total_income - total_fuel_expenses - total_deductions;
  has_negative := net_payment < 0;

  -- Generate balance alert message if needed
  IF has_negative THEN
    balance_alert := 'Balance negativo: $' || ABS(net_payment)::TEXT || '. Revisar deducciones y gastos.';
  END IF;

  -- Update the calculation record - FIX: Explicitly use local variables
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_gross_earnings,
    fuel_expenses = total_fuel_expenses,
    other_income = total_other_income,
    driver_period_calculations.total_deductions = calculate_driver_payment_period_with_validation.total_deductions,
    driver_period_calculations.total_income = calculate_driver_payment_period_with_validation.total_income,
    driver_period_calculations.net_payment = calculate_driver_payment_period_with_validation.net_payment,
    has_negative_balance = has_negative,
    balance_alert_message = balance_alert,
    calculated_at = now(),
    calculated_by = current_user_id,
    updated_at = now()
  WHERE id = calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período de conductor recalculado exitosamente',
    'calculation_id', calculation_id,
    'totals', jsonb_build_object(
      'gross_earnings', total_gross_earnings,
      'fuel_expenses', total_fuel_expenses,
      'other_income', total_other_income,
      'total_deductions', total_deductions,
      'total_income', total_income,
      'net_payment', net_payment,
      'has_negative_balance', has_negative,
      'balance_alert_message', balance_alert
    ),
    'calculated_at', now(),
    'calculated_by', current_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Error recalculando período de conductor: %', SQLERRM;
END;
$function$;