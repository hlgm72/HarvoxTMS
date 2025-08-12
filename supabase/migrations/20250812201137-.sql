-- Keep validating calculator consistent with base calculator and generator
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calculation_record RECORD;
  calculated_gross_earnings NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_fuel_expenses NUMERIC := 0;
  calculated_total_deductions NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
  calculated_has_negative_balance BOOLEAN := false;
  period_start_date DATE;
  period_end_date DATE;
  target_company_id UUID;
BEGIN
  -- Guard against re-entrancy
  PERFORM set_config('app.recalc_in_progress', 'on', true);

  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    PERFORM set_config('app.recalc_in_progress', 'off', true);
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get calculation record
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    PERFORM set_config('app.recalc_in_progress', 'off', true);
    RAISE EXCEPTION 'Cálculo no encontrado';
  END IF;

  -- Get period dates and company_id
  SELECT 
    cpp.period_start_date,
    cpp.period_end_date,
    cpp.company_id
  INTO period_start_date, period_end_date, target_company_id
  FROM company_payment_periods cpp
  WHERE cpp.id = calculation_record.company_payment_period_id;

  -- 1) Validate permissions (allow driver themselves or company admins)
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
      AND company_id = target_company_id
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
  ) AND current_user_id != calculation_record.driver_user_id THEN
    PERFORM set_config('app.recalc_in_progress', 'off', true);
    RAISE EXCEPTION 'Sin permisos para calcular este período de pago';
  END IF;

  -- 2) Gross earnings (align statuses)
  SELECT COALESCE(SUM(l.total_amount), 0)
    INTO calculated_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = calculation_record.company_payment_period_id
    AND l.status IN ('assigned', 'in_transit', 'delivered', 'completed')
    AND l.total_amount IS NOT NULL;

  -- 3) Other income (company period id)
  SELECT COALESCE(SUM(oi.amount), 0)
    INTO calculated_other_income
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = calculation_record.company_payment_period_id
    AND oi.status = 'approved';

  -- 4) Fuel expenses (company period id)
  SELECT COALESCE(SUM(fe.total_amount), 0)
    INTO calculated_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = calculation_record.company_payment_period_id
    AND (fe.status IS NULL OR fe.status IN ('approved', 'verified', 'posted'));

  -- 5) Deductions (generate and recalc on driver calc id)
  PERFORM generate_load_percentage_deductions(NULL, calculation_id);
  SELECT COALESCE(SUM(ei.amount), 0)
    INTO calculated_total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = calculation_id
    AND ei.status = 'applied';

  -- 6) Totals
  calculated_total_income := calculated_gross_earnings + calculated_other_income;
  calculated_net_payment := calculated_total_income - calculated_fuel_expenses - calculated_total_deductions;
  calculated_has_negative_balance := calculated_net_payment < 0;

  -- 7) Update record
  UPDATE driver_period_calculations
  SET
    gross_earnings = calculated_gross_earnings,
    other_income = calculated_other_income,
    fuel_expenses = calculated_fuel_expenses,
    total_deductions = calculated_total_deductions,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = calculated_has_negative_balance,
    calculated_by = current_user_id,
    calculated_at = now(),
    updated_at = now(),
    balance_alert_message = CASE 
      WHEN calculated_has_negative_balance THEN 
        'Saldo negativo: $' || to_char(ABS(calculated_net_payment), 'FM999999990.00')
      ELSE NULL
    END
  WHERE id = calculation_id;

  PERFORM set_config('app.recalc_in_progress', 'off', true);
  RETURN jsonb_build_object(
    'success', true,
    'period_calculation_id', calculation_id,
    'message', 'Calculation completed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.recalc_in_progress', 'off', true);
  RAISE;
END;
$function$;