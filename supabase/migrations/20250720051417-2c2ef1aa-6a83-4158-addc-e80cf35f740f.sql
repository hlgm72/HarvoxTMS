-- Finalizar con función de cálculo y limpiar tabla antigua

-- 1. Función para calcular totales de un conductor en un período específico
CREATE OR REPLACE FUNCTION public.calculate_driver_period_totals(
  company_payment_period_id_param UUID,
  driver_user_id_param UUID
)
RETURNS TABLE(
  gross_earnings NUMERIC,
  total_deductions NUMERIC,
  other_income NUMERIC,
  total_income NUMERIC,
  net_payment NUMERIC,
  has_negative_balance BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Calcular ingresos de cargas
  SELECT COALESCE(SUM(total_amount), 0) INTO load_earnings
  FROM public.loads 
  WHERE payment_period_id = company_payment_period_id_param
  AND driver_user_id = driver_user_id_param;
  
  -- Calcular gastos de combustible
  SELECT COALESCE(SUM(total_amount), 0) INTO fuel_costs
  FROM public.fuel_expenses 
  WHERE payment_period_id = company_payment_period_id_param
  AND driver_user_id = driver_user_id_param;
  
  -- Calcular otros gastos (expense_instances no tiene driver_user_id, son gastos generales del período)
  SELECT COALESCE(SUM(amount), 0) INTO expense_costs
  FROM public.expense_instances 
  WHERE payment_period_id = company_payment_period_id_param;
  
  -- Calcular otros ingresos
  SELECT COALESCE(SUM(amount), 0) INTO other_income_total
  FROM public.other_income 
  WHERE payment_period_id = company_payment_period_id_param
  AND driver_user_id = driver_user_id_param;
  
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
$$;

-- 2. Eliminar la tabla payment_periods antigua (ya no se necesita)
DROP TABLE IF EXISTS public.payment_periods CASCADE;

-- 3. Crear función para obtener todos los conductores de un período con sus cálculos
CREATE OR REPLACE FUNCTION public.get_period_drivers_summary(
  company_payment_period_id_param UUID
)
RETURNS TABLE(
  driver_user_id UUID,
  driver_name TEXT,
  gross_earnings NUMERIC,
  total_deductions NUMERIC,
  other_income NUMERIC,
  total_income NUMERIC,
  net_payment NUMERIC,
  has_negative_balance BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    l.driver_user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Sin nombre') as driver_name,
    calc.gross_earnings,
    calc.total_deductions,
    calc.other_income,
    calc.total_income,
    calc.net_payment,
    calc.has_negative_balance
  FROM public.loads l
  LEFT JOIN public.profiles p ON l.driver_user_id = p.user_id
  CROSS JOIN LATERAL public.calculate_driver_period_totals(company_payment_period_id_param, l.driver_user_id) calc
  WHERE l.payment_period_id = company_payment_period_id_param
  
  UNION
  
  SELECT DISTINCT
    fe.driver_user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Sin nombre') as driver_name,
    calc.gross_earnings,
    calc.total_deductions,
    calc.other_income,
    calc.total_income,
    calc.net_payment,
    calc.has_negative_balance
  FROM public.fuel_expenses fe
  LEFT JOIN public.profiles p ON fe.driver_user_id = p.user_id
  CROSS JOIN LATERAL public.calculate_driver_period_totals(company_payment_period_id_param, fe.driver_user_id) calc
  WHERE fe.payment_period_id = company_payment_period_id_param
  
  UNION
  
  SELECT DISTINCT
    oi.driver_user_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Sin nombre') as driver_name,
    calc.gross_earnings,
    calc.total_deductions,
    calc.other_income,
    calc.total_income,
    calc.net_payment,
    calc.has_negative_balance
  FROM public.other_income oi
  LEFT JOIN public.profiles p ON oi.driver_user_id = p.user_id
  CROSS JOIN LATERAL public.calculate_driver_period_totals(company_payment_period_id_param, oi.driver_user_id) calc
  WHERE oi.payment_period_id = company_payment_period_id_param;
END;
$$;