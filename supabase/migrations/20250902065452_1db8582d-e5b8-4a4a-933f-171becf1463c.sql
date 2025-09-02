-- Fix parameter order issues and SQL ambiguity in payment period recalculation

-- 1. Fix the calculate_driver_payment_period_v2 function to resolve column ambiguity
CREATE OR REPLACE FUNCTION calculate_driver_payment_period_v2(
  driver_user_id_param UUID,
  company_payment_period_id_param UUID
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  total_loads_amount NUMERIC := 0;
  total_fuel_amount NUMERIC := 0;
  total_deductions_amount NUMERIC := 0; -- Renamed to avoid ambiguity
  other_income_amount NUMERIC := 0;
  total_income_calc NUMERIC := 0;
  net_payment_calc NUMERIC := 0;
  existing_calculation_id UUID;
  company_id_var UUID;
BEGIN
  -- Log start of calculation
  RAISE NOTICE 'calculate_driver_payment_period_v2: Iniciando cálculo para conductor % en período %', 
    driver_user_id_param, company_payment_period_id_param;

  -- Get company_id from the payment period
  SELECT company_id INTO company_id_var
  FROM company_payment_periods
  WHERE id = company_payment_period_id_param;

  IF company_id_var IS NULL THEN
    RAISE EXCEPTION 'Período de pago no encontrado: %', company_payment_period_id_param;
  END IF;

  -- Calculate total from loads
  SELECT COALESCE(SUM(total_amount), 0) INTO total_loads_amount
  FROM loads 
  WHERE driver_user_id = driver_user_id_param
    AND payment_period_id = company_payment_period_id_param
    AND status IN ('delivered', 'completed');
  
  RAISE NOTICE 'calculate_driver_payment_period_v2: Encontradas cargas por $%', total_loads_amount;

  -- Calculate fuel expenses  
  SELECT COALESCE(SUM(total_amount), 0) INTO total_fuel_amount
  FROM fuel_expenses fe
  JOIN company_payment_periods cpp ON fe.payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc 
    WHERE dpc.company_payment_period_id = cpp.id
  )
  WHERE fe.driver_user_id = driver_user_id_param
    AND cpp.id = company_payment_period_id_param;

  RAISE NOTICE 'calculate_driver_payment_period_v2: Encontrados gastos de combustible por $%', total_fuel_amount;

  -- Calculate deductions (avoid column ambiguity by fully qualifying)
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions_amount
  FROM expense_instances ei
  JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
  WHERE dpc.driver_user_id = driver_user_id_param
    AND dpc.company_payment_period_id = company_payment_period_id_param
    AND ei.status = 'applied';

  RAISE NOTICE 'calculate_driver_payment_period_v2: Encontradas deducciones por $%', total_deductions_amount;

  -- Calculate totals
  total_income_calc := total_loads_amount + other_income_amount;
  net_payment_calc := total_income_calc - total_fuel_amount - total_deductions_amount;

  -- Get existing calculation record
  SELECT id INTO existing_calculation_id
  FROM driver_period_calculations
  WHERE driver_user_id = driver_user_id_param
    AND company_payment_period_id = company_payment_period_id_param;

  -- Update or create calculation record
  IF existing_calculation_id IS NOT NULL THEN
    UPDATE driver_period_calculations SET
      gross_earnings = total_loads_amount,
      fuel_expenses = total_fuel_amount,
      total_deductions = total_deductions_amount,
      other_income = other_income_amount,
      total_income = total_income_calc,
      net_payment = net_payment_calc,
      has_negative_balance = (net_payment_calc < 0),
      calculated_at = now(),
      updated_at = now()
    WHERE id = existing_calculation_id;
  ELSE
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      total_income,
      net_payment,
      has_negative_balance,
      payment_status,
      calculated_at
    ) VALUES (
      driver_user_id_param,
      company_payment_period_id_param,
      total_loads_amount,
      total_fuel_amount,
      total_deductions_amount,
      other_income_amount,
      total_income_calc,
      net_payment_calc,
      (net_payment_calc < 0),
      'calculated',
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'driver_user_id', driver_user_id_param,
    'company_payment_period_id', company_payment_period_id_param,
    'calculations', jsonb_build_object(
      'gross_earnings', total_loads_amount,
      'fuel_expenses', total_fuel_amount,
      'total_deductions', total_deductions_amount,
      'net_payment', net_payment_calc
    )
  );
END;
$$;

-- 2. Fix the recalculate_driver_payment_period function to ensure correct parameter order
CREATE OR REPLACE FUNCTION recalculate_driver_payment_period(
  driver_user_id_param UUID,
  company_payment_period_id_param UUID
) RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  -- Validate parameters before proceeding
  IF driver_user_id_param IS NULL OR company_payment_period_id_param IS NULL THEN
    RAISE EXCEPTION 'Parámetros inválidos: driver_user_id=%, company_payment_period_id=%', 
      driver_user_id_param, company_payment_period_id_param;
  END IF;

  -- Validate that the company_payment_period_id actually exists
  IF NOT EXISTS (SELECT 1 FROM company_payment_periods WHERE id = company_payment_period_id_param) THEN
    RAISE EXCEPTION 'Período de pago no encontrado: %', company_payment_period_id_param;
  END IF;

  -- Validate that the driver_user_id exists and is a driver
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    JOIN company_payment_periods cpp ON ucr.company_id = cpp.company_id
    WHERE ucr.user_id = driver_user_id_param 
      AND cpp.id = company_payment_period_id_param
      AND ucr.role = 'driver'
      AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Driver no válido o no pertenece a la empresa del período: %', driver_user_id_param;
  END IF;

  RAISE NOTICE '🔄 RECALCULATE: Iniciando recálculo para driver % en período %', 
    driver_user_id_param, company_payment_period_id_param;
  
  RAISE NOTICE '🔄 RECALCULATE: Llamando calculate_driver_payment_period_v2 con parámetros: driver_user_id=%, company_payment_period_id=%', 
    driver_user_id_param, company_payment_period_id_param;

  -- Call the calculation function with correct parameter order
  RETURN calculate_driver_payment_period_v2(driver_user_id_param, company_payment_period_id_param);

EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE '❌ RECALCULATE ERROR: % - SQLSTATE: %', SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Error en recálculo: %', SQLERRM;
END;
$$;

-- 3. Fix auto_recalculate_driver_payment_period to ensure correct parameter order
CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  target_driver_id UUID;
  target_period_id UUID;
  company_id_var UUID;
BEGIN
  -- Handle different trigger scenarios
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- For loads table
    IF TG_TABLE_NAME = 'loads' THEN
      target_driver_id := NEW.driver_user_id;
      target_period_id := NEW.payment_period_id;
      
      -- Get company_id from the loads record
      SELECT cpp.company_id INTO company_id_var
      FROM company_payment_periods cpp
      WHERE cpp.id = target_period_id;
      
    -- For fuel_expenses table  
    ELSIF TG_TABLE_NAME = 'fuel_expenses' THEN
      target_driver_id := NEW.driver_user_id;
      
      -- Get the company payment period from the fuel expense payment_period_id
      SELECT dpc.company_payment_period_id INTO target_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = NEW.payment_period_id;
      
    -- For expense_instances table
    ELSIF TG_TABLE_NAME = 'expense_instances' THEN
      -- Get driver and period from the payment_period_id (which is a driver_period_calculation id)
      SELECT dpc.driver_user_id, dpc.company_payment_period_id 
      INTO target_driver_id, target_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = NEW.payment_period_id;
    END IF;
  END IF;

  -- Validate we have both required parameters
  IF target_driver_id IS NULL OR target_period_id IS NULL THEN
    RAISE NOTICE '❌ AUTO_RECALC SKIP: Missing parameters - Driver: %, Período: %', 
      target_driver_id, target_period_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Ensure correct parameter order: driver_user_id FIRST, then company_payment_period_id
  RAISE NOTICE '🔄 AUTO_RECALC: Iniciando auto-recálculo para driver % en período %', 
    target_driver_id, target_period_id;

  BEGIN
    PERFORM recalculate_driver_payment_period(target_driver_id, target_period_id);
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ AUTO_RECALC ERROR: Error en recálculo: % - Driver: %, Período: %', 
        SQLERRM, target_driver_id, target_period_id;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;