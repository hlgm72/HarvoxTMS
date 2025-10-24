
-- 🔧 CORRECCIÓN FINAL: No duplicar deducciones de porcentajes
-- Las deducciones de loads YA están en expense_instances, no sumarlas dos veces

CREATE OR REPLACE FUNCTION public.calculate_user_payment_period_with_validation(calculation_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
    v_company_period_id uuid;
    v_period_start date;
    v_period_end date;
    v_gross_earnings numeric := 0;
    v_other_income numeric := 0;
    v_fuel_expenses numeric := 0;
    v_total_deductions numeric := 0;
    v_net_payment numeric := 0;
    v_result json;
BEGIN
    -- Get user_payroll data
    SELECT user_id, company_payment_period_id
    INTO v_user_id, v_company_period_id
    FROM user_payrolls
    WHERE id = calculation_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User payroll not found for id: %', calculation_id;
    END IF;

    -- Get period dates
    SELECT period_start_date, period_end_date
    INTO v_period_start, v_period_end
    FROM company_payment_periods
    WHERE id = v_company_period_id;

    -- Calculate gross earnings BRUTO (total de loads sin deducciones)
    SELECT COALESCE(SUM(l.total_amount), 0)
    INTO v_gross_earnings
    FROM loads l
    WHERE l.driver_user_id = v_user_id
      AND l.payment_period_id = v_company_period_id;

    -- Calculate other income
    SELECT COALESCE(SUM(amount), 0)
    INTO v_other_income
    FROM other_income
    WHERE user_id = v_user_id
      AND payment_period_id = v_company_period_id;

    -- Calculate fuel expenses
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_fuel_expenses
    FROM fuel_expenses
    WHERE driver_user_id = v_user_id
      AND payment_period_id = v_company_period_id;

    -- Calculate ALL deductions from expense_instances
    -- (incluyendo las deducciones de porcentajes que ya fueron generadas)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_deductions
    FROM expense_instances
    WHERE user_id = v_user_id
      AND payment_period_id = v_company_period_id
      AND status IN ('planned', 'applied');

    -- Calculate net payment
    -- Formula: (gross + other_income) - fuel - deductions
    v_net_payment := v_gross_earnings + v_other_income - v_fuel_expenses - v_total_deductions;

    -- Update user_payroll
    UPDATE user_payrolls
    SET 
        gross_earnings = v_gross_earnings,
        other_income = v_other_income,
        fuel_expenses = v_fuel_expenses,
        total_deductions = v_total_deductions,
        net_payment = v_net_payment,
        updated_at = now()
    WHERE id = calculation_id;

    -- Return result
    v_result := json_build_object(
        'success', true,
        'user_payroll_id', calculation_id,
        'gross_earnings', v_gross_earnings,
        'other_income', v_other_income,
        'fuel_expenses', v_fuel_expenses,
        'total_deductions', v_total_deductions,
        'net_payment', v_net_payment
    );

    RETURN v_result;
END;
$function$;
