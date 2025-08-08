-- Fix ambiguous column reference in calculate_driver_period_totals function
CREATE OR REPLACE FUNCTION public.calculate_driver_period_totals(company_payment_period_id_param uuid, driver_user_id_param uuid)
 RETURNS TABLE(gross_earnings numeric, total_deductions numeric, other_income numeric, total_income numeric, net_payment numeric, has_negative_balance boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  load_earnings NUMERIC := 0;
  fuel_costs NUMERIC := 0;
  expense_costs NUMERIC := 0;
  other_income_total NUMERIC := 0;
  calculated_gross NUMERIC := 0;
  calculated_deductions NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net NUMERIC := 0;
  is_negative BOOLEAN := false;
BEGIN
  -- Calcular ingresos de cargas con alias de tabla
  SELECT COALESCE(SUM(l.total_amount), 0) INTO load_earnings
  FROM public.loads l
  WHERE l.payment_period_id = company_payment_period_id_param
  AND l.driver_user_id = driver_user_id_param;
  
  -- Calcular gastos de combustible con alias de tabla
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_costs
  FROM public.fuel_expenses fe
  WHERE fe.payment_period_id = company_payment_period_id_param
  AND fe.driver_user_id = driver_user_id_param;
  
  -- Calcular otros gastos con alias de tabla
  SELECT COALESCE(SUM(ei.amount), 0) INTO expense_costs
  FROM public.expense_instances ei
  WHERE ei.payment_period_id = company_payment_period_id_param;
  
  -- Calcular otros ingresos con alias de tabla
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income_total
  FROM public.other_income oi
  WHERE oi.payment_period_id = company_payment_period_id_param
  AND oi.driver_user_id = driver_user_id_param;
  
  -- Calcular totales
  calculated_gross := load_earnings;
  calculated_deductions := fuel_costs + expense_costs;
  calculated_other_income := other_income_total;
  calculated_total_income := calculated_gross + calculated_other_income;
  calculated_net := calculated_total_income - calculated_deductions;
  is_negative := calculated_net < 0;
  
  RETURN QUERY SELECT 
    calculated_gross,
    calculated_deductions,
    calculated_other_income,
    calculated_total_income,
    calculated_net,
    is_negative;
END;
$function$;