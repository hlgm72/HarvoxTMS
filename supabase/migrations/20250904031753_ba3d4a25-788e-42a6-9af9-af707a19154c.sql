-- Drop function and recreate to fix fuel expenses calculation 
DROP FUNCTION IF EXISTS public.calculate_driver_payment_period_with_validation(uuid);

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calculation_record RECORD;
  company_period_record RECORD;
  aggregated_loads RECORD;
  aggregated_fuel RECORD;
  aggregated_deductions RECORD;
  aggregated_other_income RECORD;
  total_gross_earnings NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
  calculated_has_negative_balance BOOLEAN := false;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Get the calculation record and validate permissions
  SELECT dpc.*, cpp.company_id, cpp.period_start_date, cpp.period_end_date, cpp.status as period_status
  INTO calculation_record
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
    AND company_id = calculation_record.company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin', 'driver')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_CALCULATE_PAYMENTS';
  END IF;

  RAISE NOTICE '🔄 CALCULATING for driver % in period % (% to %)', 
    calculation_record.driver_user_id, 
    calculation_record.company_payment_period_id,
    calculation_record.period_start_date, 
    calculation_record.period_end_date;

  -- 1. CALCULATE GROSS EARNINGS FROM LOADS
  SELECT 
    COALESCE(SUM(l.total_amount), 0) as total_gross,
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0) as total_dispatching,
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0) as total_factoring,
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0) as total_leasing
  INTO aggregated_loads
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.pickup_date >= calculation_record.period_start_date
    AND l.pickup_date <= calculation_record.period_end_date
    AND l.status IN ('delivered', 'confirmed');

  total_gross_earnings := COALESCE(aggregated_loads.total_gross, 0);
  
  RAISE NOTICE '📊 LOADS: gross=%, dispatching=%, factoring=%, leasing=%', 
    total_gross_earnings, aggregated_loads.total_dispatching, 
    aggregated_loads.total_factoring, aggregated_loads.total_leasing;

  -- 2. CALCULATE FUEL EXPENSES 🚨 FIXED: Include ALL relevant statuses
  SELECT COALESCE(SUM(fe.total_amount), 0) as total_fuel
  INTO aggregated_fuel
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = calculation_record.company_payment_period_id
    AND fe.status IN ('approved', 'pending', 'verified'); -- 🚨 FIXED: Include pending status

  total_fuel_expenses := COALESCE(aggregated_fuel.total_fuel, 0);
  
  RAISE NOTICE '⛽ FUEL EXPENSES: total=%', total_fuel_expenses;

  -- 3. CALCULATE DEDUCTIONS (from expense_instances)
  SELECT COALESCE(SUM(ei.amount), 0) as total_deductions_amount
  INTO aggregated_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = calculation_id
    AND ei.status = 'applied';

  -- Add percentage-based deductions from loads
  total_deductions := COALESCE(aggregated_deductions.total_deductions_amount, 0) + 
                     COALESCE(aggregated_loads.total_dispatching, 0) +
                     COALESCE(aggregated_loads.total_factoring, 0) +
                     COALESCE(aggregated_loads.total_leasing, 0);

  RAISE NOTICE '💸 DEDUCTIONS: expense_instances=%, load_percentages=%, total=%', 
    COALESCE(aggregated_deductions.total_deductions_amount, 0),
    (COALESCE(aggregated_loads.total_dispatching, 0) + COALESCE(aggregated_loads.total_factoring, 0) + COALESCE(aggregated_loads.total_leasing, 0)),
    total_deductions;

  -- 4. CALCULATE OTHER INCOME
  SELECT COALESCE(SUM(oi.amount), 0) as total_other_income_amount
  INTO aggregated_other_income
  FROM other_income oi
  WHERE oi.driver_user_id = calculation_record.driver_user_id
    AND oi.income_date >= calculation_record.period_start_date
    AND oi.income_date <= calculation_record.period_end_date
    AND oi.status IN ('approved', 'pending', 'verified');

  total_other_income := COALESCE(aggregated_other_income.total_other_income_amount, 0);

  RAISE NOTICE '💰 OTHER INCOME: total=%', total_other_income;

  -- 5. CALCULATE FINAL TOTALS
  calculated_total_income := total_gross_earnings + total_other_income;
  calculated_net_payment := calculated_total_income - total_fuel_expenses - total_deductions;
  calculated_has_negative_balance := calculated_net_payment < 0;

  RAISE NOTICE '📈 FINAL CALCULATION: income=%, fuel=%, deductions=%, net=%', 
    calculated_total_income, total_fuel_expenses, total_deductions, calculated_net_payment;

  -- 6. UPDATE THE CALCULATION RECORD
  UPDATE driver_period_calculations SET
    gross_earnings = total_gross_earnings,
    fuel_expenses = total_fuel_expenses,
    total_deductions = total_deductions,
    other_income = total_other_income,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = calculated_has_negative_balance,
    payment_status = CASE 
      WHEN calculated_has_negative_balance THEN 'requires_review'
      ELSE 'calculated'
    END,
    updated_at = now()
  WHERE id = calculation_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'company_payment_period_id', calculation_record.company_payment_period_id,
    'period_range', jsonb_build_object(
      'start_date', calculation_record.period_start_date,
      'end_date', calculation_record.period_end_date
    ),
    'calculated_values', jsonb_build_object(
      'gross_earnings', total_gross_earnings,
      'fuel_expenses', total_fuel_expenses,
      'total_deductions', total_deductions,
      'other_income', total_other_income,
      'total_income', calculated_total_income,
      'net_payment', calculated_net_payment,
      'has_negative_balance', calculated_has_negative_balance
    ),
    'breakdown', jsonb_build_object(
      'loads', jsonb_build_object(
        'total_amount', total_gross_earnings,
        'dispatching_fees', COALESCE(aggregated_loads.total_dispatching, 0),
        'factoring_fees', COALESCE(aggregated_loads.total_factoring, 0),
        'leasing_fees', COALESCE(aggregated_loads.total_leasing, 0)
      ),
      'fuel_expenses', jsonb_build_object(
        'total_amount', total_fuel_expenses
      ),
      'deductions', jsonb_build_object(
        'expense_instances', COALESCE(aggregated_deductions.total_deductions_amount, 0),
        'percentage_deductions', (COALESCE(aggregated_loads.total_dispatching, 0) + COALESCE(aggregated_loads.total_factoring, 0) + COALESCE(aggregated_loads.total_leasing, 0)),
        'total', total_deductions
      ),
      'other_income', jsonb_build_object(
        'total_amount', total_other_income
      )
    ),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_CALCULATION_FAILED: %', SQLERRM;
END;
$function$;