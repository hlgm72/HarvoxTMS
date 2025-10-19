-- Fix table name: use user_payrolls instead of driver_period_calculations
CREATE OR REPLACE FUNCTION recalculate_driver_period_on_fuel_change()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_total_fuel_expenses NUMERIC;
  v_calculation_id UUID;
BEGIN
  -- Determine which driver and period to recalculate
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
  END IF;

  -- Calculate total fuel expenses for this driver and period
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_fuel_expenses
  FROM fuel_expenses
  WHERE driver_user_id = v_driver_id
    AND payment_period_id = v_period_id;

  -- Get the calculation record ID from user_payrolls
  SELECT id INTO v_calculation_id
  FROM user_payrolls
  WHERE user_id = v_driver_id
    AND company_payment_period_id = v_period_id;

  -- Update the user_payrolls if record exists
  IF v_calculation_id IS NOT NULL THEN
    UPDATE user_payrolls
    SET 
      fuel_expenses = v_total_fuel_expenses,
      net_payment = COALESCE(gross_earnings, 0) + COALESCE(other_income, 0) - COALESCE(total_deductions, 0) - v_total_fuel_expenses,
      updated_at = NOW()
    WHERE id = v_calculation_id;
  END IF;

  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;