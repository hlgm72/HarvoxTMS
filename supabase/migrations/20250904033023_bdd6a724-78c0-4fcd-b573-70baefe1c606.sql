-- Fix the load status filter to include the correct statuses
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_v2(target_driver_user_id uuid, target_period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  driver_calc_id UUID;
  company_period_id UUID;
  calculated_fuel_expenses NUMERIC := 0;
  calculated_gross_earnings NUMERIC := 0;
  calculated_total_deductions NUMERIC := 0;
  calculated_percentage_deductions NUMERIC := 0;
  calculated_expense_deductions NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
BEGIN
  RAISE NOTICE '🔄 v4.7-LOAD-STATUS-FIX: Iniciando recálculo para conductor % en período %', target_driver_user_id, target_period_id;

  -- Determinar IDs
  SELECT cpp.id INTO company_period_id FROM company_payment_periods cpp WHERE cpp.id = target_period_id;

  IF company_period_id IS NOT NULL THEN
    SELECT dpc.id INTO driver_calc_id FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = target_driver_user_id AND dpc.company_payment_period_id = target_period_id;
  ELSE
    SELECT dpc.id, dpc.company_payment_period_id INTO driver_calc_id, company_period_id
    FROM driver_period_calculations dpc WHERE dpc.id = target_period_id AND dpc.driver_user_id = target_driver_user_id;
  END IF;

  IF company_period_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró company_payment_period válido para period_id %', target_period_id;
  END IF;

  -- Get period dates
  SELECT cpp.period_start_date, cpp.period_end_date
  INTO calculation_record
  FROM company_payment_periods cpp 
  WHERE cpp.id = company_period_id;

  -- 1. Calculate fuel expenses
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO calculated_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = target_driver_user_id
    AND fe.payment_period_id = company_period_id
    AND fe.status IN ('approved', 'pending', 'verified');

  -- 2. Calculate gross earnings from loads 🚨 FIX: Include correct load statuses
  SELECT COALESCE(SUM(l.total_amount), 0) INTO calculated_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
    AND l.pickup_date >= calculation_record.period_start_date
    AND l.pickup_date <= calculation_record.period_end_date
    AND l.status IN ('delivered', 'confirmed', 'assigned', 'completed'); -- 🚨 FIX: Include more statuses

  RAISE NOTICE '📦 LOADS: Found loads worth % for period % to %', calculated_gross_earnings, calculation_record.period_start_date, calculation_record.period_end_date;

  -- 3. Calculate expense deductions
  SELECT COALESCE(SUM(ei.amount), 0) INTO calculated_expense_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = driver_calc_id 
    AND ei.status = 'applied';

  -- 4. Calculate percentage deductions from loads 🚨 FIX: Include same statuses
  SELECT 
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0) +
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0) +
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0)
  INTO calculated_percentage_deductions
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
    AND l.pickup_date >= calculation_record.period_start_date
    AND l.pickup_date <= calculation_record.period_end_date
    AND l.status IN ('delivered', 'confirmed', 'assigned', 'completed'); -- 🚨 FIX: Same statuses

  calculated_total_deductions := calculated_expense_deductions + calculated_percentage_deductions;

  -- 5. Calculate other income
  SELECT COALESCE(SUM(oi.amount), 0) INTO calculated_other_income
  FROM other_income oi
  WHERE oi.user_id = target_driver_user_id
    AND oi.income_date >= calculation_record.period_start_date
    AND oi.income_date <= calculation_record.period_end_date
    AND oi.status IN ('approved', 'pending', 'verified');

  -- 6. Calculate final net payment
  calculated_net_payment := (calculated_gross_earnings + calculated_other_income) - calculated_fuel_expenses - calculated_total_deductions;

  -- 7. Update calculation record
  UPDATE driver_period_calculations
  SET 
    gross_earnings = calculated_gross_earnings,      -- 🚨 NOW SHOULD INCLUDE LOADS
    fuel_expenses = calculated_fuel_expenses,
    total_deductions = calculated_total_deductions,
    other_income = calculated_other_income,
    total_income = calculated_gross_earnings + calculated_other_income,
    net_payment = calculated_net_payment,
    has_negative_balance = calculated_net_payment < 0,
    updated_at = now()
  WHERE id = driver_calc_id;

  RAISE NOTICE '🎉 FINAL: gross=% (CARGAS), fuel=%, deductions=%, other=%, net=%', 
    calculated_gross_earnings, calculated_fuel_expenses, calculated_total_deductions, calculated_other_income, calculated_net_payment;

END;
$function$;