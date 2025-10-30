-- Fix get_driver_period_calculation_secure to use user_payrolls instead of driver_period_calculations
CREATE OR REPLACE FUNCTION public.get_driver_period_calculation_secure(
  driver_user_id_param UUID,
  payment_period_id_param UUID,
  company_id_param UUID
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculation_id UUID;
BEGIN
  -- Direct query bypassing RLS since this function runs as SECURITY DEFINER
  -- FIXED: Use user_payrolls instead of driver_period_calculations
  SELECT up.id INTO calculation_id
  FROM user_payrolls up
  JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
  WHERE up.user_id = driver_user_id_param
  AND cpp.id = payment_period_id_param
  AND cpp.company_id = company_id_param;
  
  RETURN calculation_id;
END;
$$;