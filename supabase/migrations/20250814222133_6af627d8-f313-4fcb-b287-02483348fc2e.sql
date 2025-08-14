-- Fix the process_company_payment_period function with correct parameters
CREATE OR REPLACE FUNCTION public.process_company_payment_period(company_payment_period_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  period_start DATE;
  period_end DATE;
  result_data jsonb;
  drivers_processed INTEGER := 0;
  total_calculations RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get period details
  SELECT company_id, period_start_date, period_end_date 
  INTO target_company_id, period_start, period_end
  FROM company_payment_periods
  WHERE id = company_payment_period_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Período de pago no encontrado';
  END IF;

  -- Validate permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para procesar este período de pago';
  END IF;

  -- Check if period exists and is in correct status
  IF NOT EXISTS (
    SELECT 1 FROM company_payment_periods cpp
    WHERE cpp.id = company_payment_period_id
    AND cpp.status = 'open'
    AND cpp.is_locked = false
  ) THEN
    RAISE EXCEPTION 'El período debe estar abierto y no bloqueado para ser procesado';
  END IF;

  -- Update period status to processing
  UPDATE company_payment_periods
  SET status = 'processing',
      updated_at = now()
  WHERE id = company_payment_period_id;

  -- Generate calculations using the correct function signature
  SELECT * INTO result_data 
  FROM generate_company_payment_periods_with_calculations(
    target_company_id, 
    period_start, 
    period_end, 
    true  -- run_calculations = true
  );

  -- Count drivers processed
  SELECT COUNT(*) INTO drivers_processed
  FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = company_payment_period_id;

  -- Update period status to calculated
  UPDATE company_payment_periods
  SET status = 'calculated',
      updated_at = now()
  WHERE id = company_payment_period_id;

  -- Get summary totals
  SELECT 
    COALESCE(SUM(gross_earnings), 0) as total_gross,
    COALESCE(SUM(other_income), 0) as total_other_income,
    COALESCE(SUM(fuel_expenses), 0) as total_fuel,
    COALESCE(SUM(total_deductions), 0) as total_deductions,
    COALESCE(SUM(net_payment), 0) as total_net
  INTO total_calculations
  FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = company_payment_period_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período procesado exitosamente',
    'period_id', company_payment_period_id,
    'drivers_processed', drivers_processed,
    'totals', jsonb_build_object(
      'gross_earnings', total_calculations.total_gross,
      'other_income', total_calculations.total_other_income,
      'fuel_expenses', total_calculations.total_fuel,
      'total_deductions', total_calculations.total_deductions,
      'net_payment', total_calculations.total_net
    ),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback status on error
  UPDATE company_payment_periods
  SET status = 'open',
      updated_at = now()
  WHERE id = company_payment_period_id;
  
  RAISE EXCEPTION 'Error procesando período: %', SQLERRM;
END;
$function$;