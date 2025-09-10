-- Fix: Include 'assigned' loads in driver payment calculations
-- Drop and recreate function to fix parameter name and include assigned loads

DROP FUNCTION IF EXISTS public.calculate_driver_payment_period_with_validation(uuid);

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calculation_record RECORD;
  total_gross_earnings NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_deductions NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
  has_negative_balance BOOLEAN := false;
  result_json JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get calculation record with validation
  SELECT dpc.*, cpp.company_id, cpp.period_start_date, cpp.period_end_date
  INTO calculation_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo de conductor no encontrado: %', calculation_id;
  END IF;

  -- Validate user has access to this calculation
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = calculation_record.company_id
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin', 'driver')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para acceder a este cálculo';
  END IF;

  -- 🚨 FIX: Calculate gross earnings from loads (INCLUDING ASSIGNED LOADS)
  SELECT COALESCE(SUM(l.total_amount), 0)
  INTO total_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = calculation_record.company_payment_period_id
    AND l.status IN ('assigned', 'completed', 'invoiced'); -- ✅ NOW INCLUDES 'assigned'

  -- Calculate fuel expenses
  SELECT COALESCE(SUM(fe.total_amount), 0)
  INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id IN (
      SELECT dpc2.id 
      FROM driver_period_calculations dpc2 
      WHERE dpc2.company_payment_period_id = calculation_record.company_payment_period_id
        AND dpc2.driver_user_id = calculation_record.driver_user_id
    )
    AND fe.status IN ('pending', 'approved');

  -- Calculate other income
  SELECT COALESCE(SUM(oi.amount), 0)
  INTO total_other_income
  FROM other_income oi
  WHERE oi.driver_user_id = calculation_record.driver_user_id
    AND oi.payment_period_id IN (
      SELECT dpc2.id 
      FROM driver_period_calculations dpc2 
      WHERE dpc2.company_payment_period_id = calculation_record.company_payment_period_id
        AND dpc2.driver_user_id = calculation_record.driver_user_id
    )
    AND oi.status IN ('pending', 'approved');

  -- Calculate total deductions from expense instances
  SELECT COALESCE(SUM(ei.amount), 0)
  INTO total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
    AND ei.payment_period_id IN (
      SELECT dpc2.id 
      FROM driver_period_calculations dpc2 
      WHERE dpc2.company_payment_period_id = calculation_record.company_payment_period_id
        AND dpc2.driver_user_id = calculation_record.driver_user_id
    )
    AND ei.status = 'applied';

  -- Calculate totals using the protected calculation functions
  calculated_total_income := total_gross_earnings + total_other_income;
  calculated_net_payment := calculated_total_income - total_fuel_expenses - total_deductions;
  has_negative_balance := calculated_net_payment < 0;

  -- Update the calculation record
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_gross_earnings,
    fuel_expenses = total_fuel_expenses,
    other_income = total_other_income,
    total_deductions = total_deductions,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = has_negative_balance,
    calculated_at = now(),
    calculated_by = current_user_id,
    updated_at = now()
  WHERE id = calculation_id;

  -- Build result
  result_json := jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'company_payment_period_id', calculation_record.company_payment_period_id,
    'gross_earnings', total_gross_earnings,
    'fuel_expenses', total_fuel_expenses,
    'other_income', total_other_income,
    'total_deductions', total_deductions,
    'total_income', calculated_total_income,
    'net_payment', calculated_net_payment,
    'has_negative_balance', has_negative_balance,
    'calculated_at', now(),
    'calculated_by', current_user_id
  );

  RETURN result_json;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error recalculando período de conductor: %', SQLERRM;
END;
$function$;