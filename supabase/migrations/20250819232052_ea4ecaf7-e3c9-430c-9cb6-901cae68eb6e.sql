-- Corregir función recalculate_payment_period_totals para usar rango de fechas en lugar de payment_period_id
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculation_record RECORD;
  company_period_record RECORD;
  loads_total NUMERIC := 0;
  fuel_total NUMERIC := 0;
  deductions_total NUMERIC := 0;
  other_income_total NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
BEGIN
  -- Get the calculation record and company period info
  SELECT dpc.*, cpp.period_start_date, cpp.period_end_date, cpp.id as company_period_id
  INTO calculation_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = period_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Calculation record not found for period_id: %', period_id;
    RETURN;
  END IF;
  
  -- Calculate loads total using delivery_date within period range
  -- Include loads that are assigned, created, in_progress, delivered, or completed
  SELECT COALESCE(SUM(total_amount), 0) INTO loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.delivery_date >= calculation_record.period_start_date
  AND l.delivery_date <= calculation_record.period_end_date
  AND l.status IN ('assigned', 'created', 'in_progress', 'delivered', 'completed');
  
  -- Calculate fuel expenses total using expense_date within period range
  SELECT COALESCE(SUM(total_amount), 0) INTO fuel_total
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.expense_date >= calculation_record.period_start_date
  AND fe.expense_date <= calculation_record.period_end_date;
  
  -- Calculate deductions total
  SELECT COALESCE(SUM(amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_id
  AND ei.status = 'applied';
  
  -- Calculate other income total (using user_id, not driver_user_id)
  SELECT COALESCE(SUM(amount), 0) INTO other_income_total
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = period_id
  AND oi.status = 'approved';
  
  -- Calculate totals
  calculated_total_income := loads_total + other_income_total;
  calculated_net_payment := calculated_total_income - fuel_total - deductions_total;
  has_negative := calculated_net_payment < 0;
  
  -- Update the calculation record
  UPDATE driver_period_calculations
  SET 
    gross_earnings = loads_total,
    fuel_expenses = fuel_total,
    total_deductions = deductions_total,
    other_income = other_income_total,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = has_negative,
    calculated_at = now(),
    updated_at = now()
  WHERE id = period_id;
  
  RAISE NOTICE 'Recalculated period % - Gross: %, Fuel: %, Deductions: %, Other Income: %, Net: %', 
    period_id, loads_total, fuel_total, deductions_total, other_income_total, calculated_net_payment;
END;
$$;