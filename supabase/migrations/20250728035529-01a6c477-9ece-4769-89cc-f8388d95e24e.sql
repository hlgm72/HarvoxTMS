-- Fix the calculate_driver_payment_period function to remove references to total_income column
-- Since total_income should be calculated dynamically, not stored

-- Drop and recreate the function without total_income references
DROP FUNCTION IF EXISTS calculate_driver_payment_period(uuid);

CREATE OR REPLACE FUNCTION calculate_driver_payment_period(period_calculation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    calculation_record driver_period_calculations%ROWTYPE;
    total_gross_earnings numeric := 0;
    total_other_income numeric := 0;
    total_fuel_expenses numeric := 0;
    total_deductions_amount numeric := 0;
    net_payment numeric := 0;
    has_negative boolean := false;
    alert_msg text := '';
BEGIN
    -- Get the calculation record
    SELECT * INTO calculation_record
    FROM driver_period_calculations
    WHERE id = period_calculation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment period calculation not found';
    END IF;
    
    -- Calculate gross earnings from loads
    SELECT COALESCE(SUM(l.total_amount), 0) INTO total_gross_earnings
    FROM loads l
    WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = calculation_record.company_payment_period_id
    AND l.status = 'completed';
    
    -- Calculate other income
    SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
    FROM other_income oi
    WHERE oi.driver_user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = calculation_record.company_payment_period_id
    AND oi.status = 'approved';
    
    -- Calculate fuel expenses
    SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = calculation_record.company_payment_period_id
    AND fe.status = 'approved';
    
    -- Calculate deductions
    SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions_amount
    FROM expense_instances ei
    WHERE ei.driver_user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
    
    -- Calculate net payment: (gross_earnings + other_income) - fuel_expenses - deductions
    net_payment := (total_gross_earnings + total_other_income) - total_fuel_expenses - total_deductions_amount;
    
    -- Check for negative balance
    has_negative := net_payment < 0;
    
    IF has_negative THEN
        alert_msg := 'El conductor tiene un balance negativo de $' || ABS(net_payment)::text;
    END IF;
    
    -- Update the calculation record with calculated values
    UPDATE driver_period_calculations
    SET 
        gross_earnings = total_gross_earnings,
        other_income = total_other_income,
        fuel_expenses = total_fuel_expenses,
        total_deductions = total_deductions_amount,
        has_negative_balance = has_negative,
        balance_alert_message = alert_msg,
        calculated_at = now(),
        calculated_by = auth.uid()
    WHERE id = period_calculation_id;
    
END;
$$;