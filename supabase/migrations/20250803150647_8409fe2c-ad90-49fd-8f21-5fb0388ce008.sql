-- CRITICAL SECURITY FIXES - Part 3
-- Fix the remaining function with mutable search_path

-- Drop and recreate recalculate_payment_period_totals function
DROP FUNCTION IF EXISTS public.recalculate_payment_period_totals(uuid);
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(target_period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  calculation_record RECORD;
  total_loads NUMERIC := 0;
  total_fuel NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  gross_total NUMERIC := 0;
  net_total NUMERIC := 0;
  has_negative BOOLEAN := false;
BEGIN
  -- Get the payment period details
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Recalculate for each driver in this period
  FOR calculation_record IN
    SELECT * FROM driver_period_calculations
    WHERE company_payment_period_id = target_period_id
  LOOP
    -- Calculate loads total
    SELECT COALESCE(SUM(l.total_amount), 0) INTO total_loads
    FROM loads l
    WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = target_period_id
    AND l.status = 'completed';
    
    -- Calculate fuel expenses
    SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = target_period_id
    AND fe.status = 'verified';
    
    -- Calculate other deductions
    SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
    FROM expense_instances ei
    WHERE ei.driver_user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = calculation_record.id
    AND ei.status = 'applied';
    
    -- Calculate other income
    SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
    FROM other_income oi
    WHERE oi.driver_user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = target_period_id
    AND oi.status = 'approved';
    
    -- Calculate totals
    gross_total := total_loads + total_other_income;
    net_total := gross_total - total_fuel - total_deductions;
    has_negative := net_total < 0;
    
    -- Generate percentage-based deductions if needed
    PERFORM generate_load_percentage_deductions(null, calculation_record.id);
    
    -- Recalculate deductions after percentage deductions
    SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
    FROM expense_instances ei
    WHERE ei.driver_user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = calculation_record.id
    AND ei.status = 'applied';
    
    -- Recalculate final total
    net_total := gross_total - total_fuel - total_deductions;
    has_negative := net_total < 0;
    
    -- Update the calculation record
    UPDATE driver_period_calculations
    SET 
      gross_earnings = total_loads,
      fuel_expenses = total_fuel,
      total_deductions = total_deductions,
      other_income = total_other_income,
      total_income = gross_total,
      net_payment = net_total,
      has_negative_balance = has_negative,
      calculated_at = now(),
      calculated_by = auth.uid(),
      updated_at = now()
    WHERE id = calculation_record.id;
  END LOOP;
END;
$function$;