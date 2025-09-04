-- Fix variable name conflict in auto_recalculate function
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
  calc_fuel_expenses NUMERIC := 0;
  calc_gross_earnings NUMERIC := 0;
  calc_total_deductions NUMERIC := 0;
  calc_other_income NUMERIC := 0;
  calc_net_payment NUMERIC := 0;
BEGIN
  RAISE NOTICE '🔄 v4.5-VAR-FIX: Iniciando recálculo para conductor % en período %', target_driver_user_id, target_period_id;

  -- Prevent recursion
  IF EXISTS (
    SELECT 1 FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query LIKE '%auto_recalculate_driver_payment_period_v2%'
    AND query LIKE '%' || target_driver_user_id::text || '%'
    AND query LIKE '%' || target_period_id::text || '%'
    AND pid != pg_backend_pid()
  ) THEN
    RAISE NOTICE '⚠️ Recálculo ya en progreso, saltando';
    RETURN;
  END IF;

  -- Get IDs
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
  SELECT 
    cpp.period_start_date,
    cpp.period_end_date
  INTO calculation_record
  FROM company_payment_periods cpp 
  WHERE cpp.id = company_period_id;

  -- Calculate fuel expenses 
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO calc_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = target_driver_user_id
    AND fe.payment_period_id = company_period_id
    AND fe.status IN ('approved', 'pending', 'verified');

  RAISE NOTICE '⛽ FUEL CALCULATED: Driver %, Period %, Amount %', target_driver_user_id, company_period_id, calc_fuel_expenses;

  -- Calculate gross earnings from loads
  SELECT COALESCE(SUM(l.total_amount), 0) INTO calc_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
    AND l.pickup_date >= calculation_record.period_start_date
    AND l.pickup_date <= calculation_record.period_end_date
    AND l.status IN ('delivered', 'confirmed');

  -- Calculate deductions from expense_instances
  SELECT COALESCE(SUM(ei.amount), 0) INTO calc_total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = driver_calc_id
    AND ei.status = 'applied';

  -- Add percentage deductions from loads
  calc_total_deductions := calc_total_deductions + (
    SELECT COALESCE(
      SUM(l.total_amount * COALESCE(l.dispatching_percentage, 0) / 100) +
      SUM(l.total_amount * COALESCE(l.factoring_percentage, 0) / 100) +
      SUM(l.total_amount * COALESCE(l.leasing_percentage, 0) / 100), 0)
    FROM loads l
    WHERE l.driver_user_id = target_driver_user_id
      AND l.pickup_date >= calculation_record.period_start_date
      AND l.pickup_date <= calculation_record.period_end_date
      AND l.status IN ('delivered', 'confirmed')
  );

  -- Calculate other income
  SELECT COALESCE(SUM(oi.amount), 0) INTO calc_other_income
  FROM other_income oi
  WHERE oi.user_id = target_driver_user_id
    AND oi.income_date >= calculation_record.period_start_date
    AND oi.income_date <= calculation_record.period_end_date
    AND oi.status IN ('approved', 'pending', 'verified');

  -- Calculate final net payment
  calc_net_payment := (calc_gross_earnings + calc_other_income) - calc_fuel_expenses - calc_total_deductions;

  -- Update calculation record
  UPDATE driver_period_calculations
  SET 
    gross_earnings = calc_gross_earnings,
    fuel_expenses = calc_fuel_expenses,
    total_deductions = calc_total_deductions,
    other_income = calc_other_income,
    total_income = calc_gross_earnings + calc_other_income,
    net_payment = calc_net_payment,
    has_negative_balance = calc_net_payment < 0,
    updated_at = now()
  WHERE id = driver_calc_id;

  RAISE NOTICE '✅ RECÁLCULO COMPLETADO: gross=%, fuel=%, deductions=%, other=%, net=%', 
    calc_gross_earnings, calc_fuel_expenses, calc_total_deductions, calc_other_income, calc_net_payment;

END;
$function$;