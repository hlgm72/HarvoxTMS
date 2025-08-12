-- Fix: remove unsupported format() specifier %.2f in calculate_driver_payment_period
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(period_calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    calculation_record driver_period_calculations%ROWTYPE;
    load_record RECORD;
    calc_gross_earnings numeric := 0;
    calc_other_income numeric := 0;
    calc_fuel_expenses numeric := 0;
    calc_deductions_amount numeric := 0;
    calc_net_payment numeric := 0;
    calc_has_negative boolean := false;
    alert_msg text := '';
BEGIN
    -- Mark recalculation in progress for this transaction
    PERFORM set_config('app.recalc_in_progress', 'on', true);

    -- Get the calculation record
    SELECT * INTO calculation_record
    FROM driver_period_calculations
    WHERE id = period_calculation_id;
    
    IF NOT FOUND THEN
        PERFORM set_config('app.recalc_in_progress', 'off', true);
        RAISE EXCEPTION 'Payment period calculation not found';
    END IF;
    
    -- 1) Clean previous auto deductions to avoid duplicates
    DELETE FROM expense_instances 
    WHERE payment_period_id = period_calculation_id
    AND expense_type_id IN (
      SELECT id FROM expense_types 
      WHERE name IN ('Leasing Fee', 'Factoring Fee', 'Dispatching Fee')
    );
    
    -- 2) Gross earnings from completed loads
    SELECT COALESCE(SUM(l.total_amount), 0) INTO calc_gross_earnings
    FROM loads l
    WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = calculation_record.company_payment_period_id
    AND l.status = 'completed';
    
    -- 3) Generate consolidated percentage deductions
    PERFORM generate_load_percentage_deductions(null, period_calculation_id);
    
    -- 4) Fuel expenses
    SELECT COALESCE(SUM(fe.total_amount), 0) INTO calc_fuel_expenses
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = period_calculation_id;
    
    -- 5) Total deductions
    SELECT COALESCE(SUM(ei.amount), 0) INTO calc_deductions_amount
    FROM expense_instances ei
    WHERE ei.user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
    
    -- 6) Other income
    SELECT COALESCE(SUM(oi.amount), 0) INTO calc_other_income
    FROM other_income oi
    WHERE oi.user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = period_calculation_id
    AND oi.status = 'approved';
    
    -- 7) Net payment and negative balance
    calc_net_payment := calc_gross_earnings + calc_other_income - calc_fuel_expenses - calc_deductions_amount;
    calc_has_negative := calc_net_payment < 0;
    IF calc_has_negative THEN
        -- Postgres format() no soporta %f; usar to_char para formateo monetario
        alert_msg := 'Balance negativo: El conductor debe $' || to_char(ABS(calc_net_payment), 'FM999999990.00');
    END IF;
    
    -- 8) Update calculation record
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
    
    -- Clear flag before returning
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
    -- Ensure flag is cleared on error, then re-raise
    PERFORM set_config('app.recalc_in_progress', 'off', true);
    RAISE;
END;
$function$;