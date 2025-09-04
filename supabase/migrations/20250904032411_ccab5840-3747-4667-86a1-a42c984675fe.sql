-- Fix the column name issue in auto_recalculate function
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
  total_fuel_expenses NUMERIC := 0;
  total_gross_earnings NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
BEGIN
  RAISE NOTICE '🔄 v4.4-COLUMN-FIX: Iniciando recálculo para conductor % en período %', target_driver_user_id, target_period_id;

  -- Determinar IDs sin triggers
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

  -- Get period dates for calculations
  SELECT 
    cpp.period_start_date,
    cpp.period_end_date
  INTO calculation_record
  FROM company_payment_periods cpp 
  WHERE cpp.id = company_period_id;

  -- 🚨 FIXED: Calculate fuel expenses properly
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = target_driver_user_id
    AND fe.payment_period_id = company_period_id
    AND fe.status IN ('approved', 'pending', 'verified');

  RAISE NOTICE '⛽ FUEL CALCULATED: Driver %, Period %, Amount %', target_driver_user_id, company_period_id, total_fuel_expenses;

  -- Calculate gross earnings from loads in the period
  SELECT COALESCE(SUM(l.total_amount), 0) INTO total_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
    AND l.pickup_date >= calculation_record.period_start_date
    AND l.pickup_date <= calculation_record.period_end_date
    AND l.status IN ('delivered', 'confirmed');

  -- Calculate deductions from expense_instances + percentage deductions from loads
  SELECT 
    COALESCE(SUM(ei.amount), 0) +
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100), 0) +
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100), 0) +
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0)
  INTO total_deductions
  FROM expense_instances ei
  FULL OUTER JOIN loads l ON (
    l.driver_user_id = target_driver_user_id
    AND l.pickup_date >= calculation_record.period_start_date
    AND l.pickup_date <= calculation_record.period_end_date
    AND l.status IN ('delivered', 'confirmed')
  )
  WHERE (ei.payment_period_id = driver_calc_id AND ei.status = 'applied')
     OR l.id IS NOT NULL;

  -- Calculate other income - 🚨 FIXED: Use correct column name
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.user_id = target_driver_user_id  -- 🚨 FIX: Use user_id instead of driver_user_id
    AND oi.income_date >= calculation_record.period_start_date
    AND oi.income_date <= calculation_record.period_end_date
    AND oi.status IN ('approved', 'pending', 'verified');

  -- Calculate final net payment
  calculated_net_payment := (total_gross_earnings + total_other_income) - total_fuel_expenses - total_deductions;

  -- Update calculation record
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_gross_earnings,
    fuel_expenses = total_fuel_expenses,
    total_deductions = total_deductions,
    other_income = total_other_income,
    total_income = total_gross_earnings + total_other_income,
    net_payment = calculated_net_payment,
    has_negative_balance = calculated_net_payment < 0,
    updated_at = now()
  WHERE id = driver_calc_id;

  RAISE NOTICE '✅ RECÁLCULO COMPLETADO: gross=%, fuel=%, deductions=%, other=%, net=%', 
    total_gross_earnings, total_fuel_expenses, total_deductions, total_other_income, calculated_net_payment;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en recálculo v4.4: %', SQLERRM;
END;
$function$;