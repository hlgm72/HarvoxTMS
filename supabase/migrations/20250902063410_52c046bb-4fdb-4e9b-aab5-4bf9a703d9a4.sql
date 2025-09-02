-- Fix calculate_driver_payment_period_v2 to correctly query loads
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_v2(
  driver_user_id_param UUID,
  company_payment_period_id_param UUID
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  period_calculation_id UUID;
  total_loads_amount NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  final_net_payment NUMERIC;
  load_count INTEGER := 0;
  fuel_count INTEGER := 0;
  deduction_count INTEGER := 0;
BEGIN
  RAISE LOG 'calculate_driver_payment_period_v2: Iniciando cálculo para conductor % en período %', 
    driver_user_id_param, company_payment_period_id_param;

  -- Get or create the driver period calculation record
  SELECT id INTO period_calculation_id
  FROM driver_period_calculations
  WHERE driver_user_id = driver_user_id_param
    AND company_payment_period_id = company_payment_period_id_param;

  IF period_calculation_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      total_income,
      net_payment,
      payment_status,
      has_negative_balance
    ) VALUES (
      driver_user_id_param,
      company_payment_period_id_param,
      0, 0, 0, 0, 0, 0,
      'calculated',
      false
    ) RETURNING id INTO period_calculation_id;
  END IF;

  -- 🔧 FIX: Calculate loads using company_payment_period_id and driver_user_id
  SELECT 
    COALESCE(SUM(l.total_amount), 0),
    COUNT(*)
  INTO total_loads_amount, load_count
  FROM loads l
  WHERE l.payment_period_id = company_payment_period_id_param  -- ✅ Fixed: usar company_payment_period_id
    AND l.driver_user_id = driver_user_id_param              -- ✅ Fixed: agregar filtro por driver
    AND l.status IN ('assigned', 'in_transit', 'delivered');

  RAISE LOG 'calculate_driver_payment_period_v2: Encontradas % cargas por $%', load_count, total_loads_amount;

  -- Calculate fuel expenses (unchanged)
  SELECT 
    COALESCE(SUM(fe.total_amount), 0),
    COUNT(*)
  INTO total_fuel_expenses, fuel_count
  FROM fuel_expenses fe
  JOIN driver_period_calculations dpc ON fe.payment_period_id = dpc.id
  WHERE dpc.id = period_calculation_id;

  RAISE LOG 'calculate_driver_payment_period_v2: Encontrados % gastos de combustible por $%', fuel_count, total_fuel_expenses;

  -- Calculate deductions from expense_instances ONLY
  SELECT 
    COALESCE(SUM(ei.amount), 0),
    COUNT(*)
  INTO total_deductions, deduction_count
  FROM expense_instances ei
  WHERE ei.payment_period_id = period_calculation_id
    AND ei.user_id = driver_user_id_param
    AND ei.status = 'applied';

  RAISE LOG 'calculate_driver_payment_period_v2: Encontradas % deducciones por $%', deduction_count, total_deductions;

  -- Calculate other income (unchanged)
  SELECT COALESCE(SUM(oi.amount), 0)
  INTO total_other_income
  FROM other_income oi
  JOIN driver_period_calculations dpc ON oi.payment_period_id = dpc.id
  WHERE dpc.id = period_calculation_id;

  -- Calculate final net payment
  final_net_payment := (total_loads_amount + total_other_income) - total_fuel_expenses - total_deductions;

  -- Update the calculation record
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_loads_amount,
    fuel_expenses = total_fuel_expenses,
    total_deductions = total_deductions,
    other_income = total_other_income,
    total_income = total_loads_amount + total_other_income,
    net_payment = final_net_payment,
    has_negative_balance = (final_net_payment < 0),
    calculated_at = now(),
    calculated_by = auth.uid(),
    updated_at = now()
  WHERE id = period_calculation_id;

  RAISE LOG 'calculate_driver_payment_period_v2 COMPLETED: driver=%, period=%, loads=%, gross=%, fuel=%, deductions=%, net=%',
    driver_user_id_param, company_payment_period_id_param, load_count, total_loads_amount, 
    total_fuel_expenses, total_deductions, final_net_payment;

  RETURN period_calculation_id;
END;
$function$;