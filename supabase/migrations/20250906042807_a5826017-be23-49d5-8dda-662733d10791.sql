-- SOLUCIÓN COMPLETA: Arreglar cálculos automáticos de conductores
-- Problema: Los triggers crean registros vacíos pero no calculan los valores reales

-- 1. CREAR FUNCIÓN DE CÁLCULO SIN AUTENTICACIÓN (para triggers)
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_no_auth(
  calculation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_record RECORD;
  period_record RECORD;
  total_gross NUMERIC := 0;
  total_fuel NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  load_record RECORD;
  fuel_record RECORD;
  expense_record RECORD;
BEGIN
  -- Obtener el cálculo y período
  SELECT dpc.*, cpp.period_start_date, cpp.period_end_date, cpp.company_id
  INTO calc_record, period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calculation not found: %', calculation_id;
  END IF;

  RAISE NOTICE 'Calculando para driver % en período % (%-%)', 
    calc_record.driver_user_id, calc_record.company_payment_period_id,
    period_record.period_start_date, period_record.period_end_date;

  -- 1. CALCULAR GROSS EARNINGS de loads (todos los status menos canceled)
  FOR load_record IN
    SELECT l.*
    FROM loads l
    WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.payment_period_id = calc_record.company_payment_period_id
    AND l.status NOT IN ('canceled', 'cancelled')
    AND l.total_amount IS NOT NULL
    AND l.total_amount > 0
  LOOP
    RAISE NOTICE 'Procesando load %: $% (status: %)', 
      load_record.load_number, load_record.total_amount, load_record.status;
    
    -- Aplicar deducciones porcentuales
    total_gross := total_gross + load_record.total_amount;
    
    -- Deducciones automáticas por porcentajes
    IF load_record.dispatching_percentage > 0 THEN
      total_deductions := total_deductions + (load_record.total_amount * load_record.dispatching_percentage / 100);
    END IF;
    
    IF load_record.factoring_percentage > 0 THEN
      total_deductions := total_deductions + (load_record.total_amount * load_record.factoring_percentage / 100);
    END IF;
    
    IF load_record.leasing_percentage > 0 THEN
      total_deductions := total_deductions + (load_record.total_amount * load_record.leasing_percentage / 100);
    END IF;
  END LOOP;

  -- 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
  AND fe.payment_period_id = calc_record.company_payment_period_id;

  RAISE NOTICE 'Total fuel expenses: $%', total_fuel;

  -- 3. CALCULAR EXPENSE INSTANCES (deducciones adicionales)
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calc_record.driver_user_id
  AND ei.payment_period_id = calculation_id
  AND ei.status = 'applied';

  RAISE NOTICE 'Total additional deductions: $%', total_deductions;

  -- 4. CALCULAR TOTALES
  total_income := total_gross + total_other_income;
  net_payment := total_income - total_fuel - total_deductions;
  has_negative := net_payment < 0;

  RAISE NOTICE 'CÁLCULO FINAL: Gross=$%, Fuel=$%, Deductions=$%, Net=$%', 
    total_gross, total_fuel, total_deductions, net_payment;

  -- 5. ACTUALIZAR EL RECORD
  UPDATE driver_period_calculations SET
    gross_earnings = total_gross,
    fuel_expenses = total_fuel,
    total_deductions = total_deductions,
    other_income = total_other_income,
    total_income = total_income,
    net_payment = net_payment,
    has_negative_balance = has_negative,
    calculated_at = now(),
    payment_status = CASE 
      WHEN net_payment < 0 THEN 'calculated'
      ELSE 'calculated'
    END,
    updated_at = now()
  WHERE id = calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id,
    'driver_user_id', calc_record.driver_user_id,
    'period_id', calc_record.company_payment_period_id,
    'gross_earnings', total_gross,
    'fuel_expenses', total_fuel,
    'total_deductions', total_deductions,
    'net_payment', net_payment,
    'has_negative_balance', has_negative,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR en calculate_driver_payment_no_auth: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'calculation_id', calculation_id
  );
END;
$$;

-- 2. MODIFICAR LA FUNCIÓN DE TRIGGER PARA QUE HAGA EL CÁLCULO COMPLETO
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_simple()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculation_id UUID;
  calc_result JSONB;
BEGIN
  RAISE NOTICE 'TRIGGER: auto_recalculate_driver_payment_period_simple ejecutado para load %', COALESCE(NEW.load_number, 'unknown');
  
  -- Solo procesar si tenemos driver y período
  IF NEW.driver_user_id IS NULL OR NEW.payment_period_id IS NULL THEN
    RAISE NOTICE 'TRIGGER: Saltando - sin driver o período asignado';
    RETURN NEW;
  END IF;

  -- 1. ASEGURAR QUE EXISTE EL DRIVER_PERIOD_CALCULATION
  SELECT ensure_driver_period_calculation_exists(
    NEW.driver_user_id,
    NEW.payment_period_id
  ) INTO calculation_id;

  RAISE NOTICE 'TRIGGER: Driver calculation ID: %', calculation_id;

  -- 2. EJECUTAR EL CÁLCULO REAL INMEDIATAMENTE
  IF calculation_id IS NOT NULL THEN
    SELECT calculate_driver_payment_no_auth(calculation_id) INTO calc_result;
    
    IF (calc_result->>'success')::boolean THEN
      RAISE NOTICE 'TRIGGER: ✅ Cálculo completado exitosamente - Net: $%', 
        calc_result->>'net_payment';
    ELSE
      RAISE NOTICE 'TRIGGER: ❌ Error en cálculo: %', calc_result->>'error';
    END IF;
  ELSE
    RAISE NOTICE 'TRIGGER: ❌ No se pudo crear/encontrar driver_period_calculation';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. RECREAR LOS TRIGGERS CON LA NUEVA FUNCIÓN
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_insert ON public.loads;
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_update ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

CREATE TRIGGER trigger_simple_auto_recalc_loads_update
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL AND
        (OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
         OLD.dispatching_percentage IS DISTINCT FROM NEW.dispatching_percentage OR
         OLD.factoring_percentage IS DISTINCT FROM NEW.factoring_percentage OR
         OLD.leasing_percentage IS DISTINCT FROM NEW.leasing_percentage OR
         OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id OR
         OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id OR
         OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

-- 4. RECALCULAR INMEDIATAMENTE EL CASO DE DIOSVANI PARA PROBAR
DO $$
DECLARE
  calculation_id UUID;
  calc_result JSONB;
BEGIN
  -- Encontrar el calculation_id de Diosvani para semana 36
  SELECT dpc.id INTO calculation_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND cpp.id = '91f545d0-0bd7-40ce-b61a-10f402a96bb5';

  IF calculation_id IS NOT NULL THEN
    RAISE NOTICE '🔄 Recalculando Diosvani (calculation_id: %)...', calculation_id;
    
    SELECT calculate_driver_payment_no_auth(calculation_id) INTO calc_result;
    
    IF (calc_result->>'success')::boolean THEN
      RAISE NOTICE '🎯 ✅ DIOSVANI RECALCULADO EXITOSAMENTE!';
      RAISE NOTICE '💰 Gross: $%, Fuel: $%, Net: $%', 
        calc_result->>'gross_earnings',
        calc_result->>'fuel_expenses', 
        calc_result->>'net_payment';
    ELSE
      RAISE NOTICE '❌ Error recalculando Diosvani: %', calc_result->>'error';
    END IF;
  ELSE
    RAISE NOTICE '❌ No se encontró calculation para Diosvani en semana 36';
  END IF;
END $$;