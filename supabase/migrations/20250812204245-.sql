-- Fix driver period calculation functions to include loads by date-range fallback and correct joins

-- 1) Update calculate_driver_payment_period_with_validation
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

  -- 2) Gross earnings: use payment_period_id match or fallback to delivery_date within period when not assigned
  SELECT COALESCE(SUM(l.total_amount), 0)
    INTO calculated_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.status IN ('assigned', 'in_transit', 'delivered', 'completed')
    AND l.total_amount IS NOT NULL
    AND (
      l.payment_period_id = calculation_record.company_payment_period_id
      OR (
        l.payment_period_id IS NULL 
        AND l.delivery_date BETWEEN period_start_date AND period_end_date
      )
    );

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

-- 2) Update calculate_driver_payment_period
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(period_calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    calculation_record driver_period_calculations%ROWTYPE;
    calc_gross_earnings numeric := 0;
    calc_other_income numeric := 0;
    calc_fuel_expenses numeric := 0;
    calc_deductions_amount numeric := 0;
    calc_net_payment numeric := 0;
    calc_has_negative boolean := false;
    alert_msg text := '';
    period_start_date DATE;
    period_end_date DATE;
BEGIN
    PERFORM set_config('app.recalc_in_progress', 'on', true);

    SELECT * INTO calculation_record
    FROM driver_period_calculations
    WHERE id = period_calculation_id;
    
    IF NOT FOUND THEN
        PERFORM set_config('app.recalc_in_progress', 'off', true);
        RAISE EXCEPTION 'Payment period calculation not found';
    END IF;

    -- Get period dates
    SELECT cpp.period_start_date, cpp.period_end_date
      INTO period_start_date, period_end_date
    FROM company_payment_periods cpp
    WHERE cpp.id = calculation_record.company_payment_period_id;
    
    DELETE FROM expense_instances 
    WHERE payment_period_id = period_calculation_id
    AND expense_type_id IN (
      SELECT id FROM expense_types 
      WHERE name IN ('Leasing Fee', 'Factoring Fee', 'Dispatching Fee')
    );
    
    -- Gross earnings (period link or date-range fallback)
    SELECT COALESCE(SUM(l.total_amount), 0) INTO calc_gross_earnings
    FROM loads l
    WHERE l.driver_user_id = calculation_record.driver_user_id
      AND l.status IN ('assigned', 'in_transit', 'delivered', 'completed')
      AND l.total_amount IS NOT NULL
      AND (
        l.payment_period_id = calculation_record.company_payment_period_id
        OR (
          l.payment_period_id IS NULL 
          AND l.delivery_date BETWEEN period_start_date AND period_end_date
        )
      );
    
    PERFORM generate_load_percentage_deductions(null, period_calculation_id);
    
    -- Fuel expenses (filter by company period id)
    SELECT COALESCE(SUM(fe.total_amount), 0) INTO calc_fuel_expenses
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = calculation_record.company_payment_period_id
    AND (fe.status IS NULL OR fe.status IN ('approved', 'verified', 'posted'));
    
    -- Total deductions (by driver calc id)
    SELECT COALESCE(SUM(ei.amount), 0) INTO calc_deductions_amount
    FROM expense_instances ei
    WHERE ei.user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
    
    -- Other income (filter by company period id)
    SELECT COALESCE(SUM(oi.amount), 0) INTO calc_other_income
    FROM other_income oi
    WHERE oi.user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = calculation_record.company_payment_period_id
    AND oi.status = 'approved';
    
    calc_net_payment := calc_gross_earnings + calc_other_income - calc_fuel_expenses - calc_deductions_amount;
    calc_has_negative := calc_net_payment < 0;
    IF calc_has_negative THEN
        alert_msg := 'Balance negativo: El conductor debe $' || to_char(ABS(calc_net_payment), 'FM999999990.00');
    END IF;
    
    UPDATE driver_period_calculations
    SET 
        gross_earnings = calc_gross_earnings,
        fuel_expenses = calc_fuel_expenses,
        total_deductions = calc_deductions_amount,
        other_income = calc_other_income,
        total_income = calc_gross_earnings + calc_other_income,
        net_payment = calc_net_payment,
        has_negative_balance = calc_has_negative,
        balance_alert_message = CASE WHEN calc_has_negative THEN alert_msg ELSE NULL END,
        calculated_at = now(),
        calculated_by = auth.uid(),
        updated_at = now()
    WHERE id = period_calculation_id;
    
    PERFORM set_config('app.recalc_in_progress', 'off', true);
    
    RETURN jsonb_build_object(
        'success', true,
        'period_calculation_id', period_calculation_id,
        'driver_user_id', calculation_record.driver_user_id,
        'totals', jsonb_build_object(
            'gross_earnings', calc_gross_earnings,
            'other_income', calc_other_income,
            'fuel_expenses', calc_fuel_expenses,
            'total_deductions', calc_deductions_amount,
            'net_payment', calc_net_payment,
            'has_negative_balance', calc_has_negative
        ),
        'message', CASE 
            WHEN calc_has_negative THEN alert_msg
            ELSE 'Calculation completed successfully'
        END
    );

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.recalc_in_progress', 'off', true);
    RAISE;
END;
$function$;

-- 3) Update calculate_driver_period_totals to align with above rules
CREATE OR REPLACE FUNCTION public.calculate_driver_period_totals(
  company_payment_period_id_param uuid,
  driver_user_id_param uuid
)
RETURNS TABLE(
  gross_earnings numeric,
  total_deductions numeric,
  other_income numeric,
  total_income numeric,
  net_payment numeric,
  has_negative_balance boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  load_earnings NUMERIC := 0;
  fuel_costs NUMERIC := 0;
  expense_costs NUMERIC := 0;
  other_income_total NUMERIC := 0;
  calculated_gross NUMERIC := 0;
  calculated_deductions NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net NUMERIC := 0;
  is_negative BOOLEAN := false;
BEGIN
  -- Loads: match by payment_period_id or by delivery_date within period when not assigned
  SELECT COALESCE(SUM(l.total_amount), 0) INTO load_earnings
  FROM public.loads l
  JOIN public.company_payment_periods cpp ON cpp.id = company_payment_period_id_param
  WHERE l.driver_user_id = driver_user_id_param
    AND l.status IN ('assigned', 'in_transit', 'delivered', 'completed')
    AND l.total_amount IS NOT NULL
    AND (
      l.payment_period_id = cpp.id
      OR (
        l.payment_period_id IS NULL
        AND l.delivery_date BETWEEN cpp.period_start_date AND cpp.period_end_date
      )
    );
  
  -- Fuel expenses (by company period & driver)
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_costs
  FROM public.fuel_expenses fe
  WHERE fe.payment_period_id = company_payment_period_id_param
    AND fe.driver_user_id = driver_user_id_param
    AND (fe.status IS NULL OR fe.status IN ('approved', 'verified', 'posted'));
  
  -- Expense instances (by driver calc id linked to this company period)
  SELECT COALESCE(SUM(ei.amount), 0) INTO expense_costs
  FROM public.expense_instances ei
  WHERE ei.status = 'applied'
    AND ei.payment_period_id IN (
      SELECT dpc.id
      FROM public.driver_period_calculations dpc
      WHERE dpc.company_payment_period_id = company_payment_period_id_param
        AND dpc.driver_user_id = driver_user_id_param
    );
  
  -- Other income (by company period & driver)
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income_total
  FROM public.other_income oi
  WHERE oi.payment_period_id = company_payment_period_id_param
    AND oi.user_id = driver_user_id_param
    AND oi.status = 'approved';
  
  -- Totals
  calculated_gross := load_earnings;
  calculated_deductions := fuel_costs + expense_costs;
  calculated_other_income := other_income_total;
  calculated_total_income := calculated_gross + calculated_other_income;
  calculated_net := calculated_total_income - calculated_deductions;
  is_negative := calculated_net < 0;
  
  RETURN QUERY SELECT 
    calculated_gross,
    calculated_deductions,
    calculated_other_income,
    calculated_total_income,
    calculated_net,
    is_negative;
END;
$function$;