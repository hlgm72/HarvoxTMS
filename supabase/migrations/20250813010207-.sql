-- ===============================================================
-- SOLUCIÓN COMPLETA Y ROBUSTA PARA CÁLCULO DE DESCUENTOS
-- ===============================================================

-- 1. Primero, eliminamos los triggers problemáticos
DROP TRIGGER IF EXISTS trigger_recalculate_after_load_change ON loads;

-- 2. Función mejorada para generar descuentos porcentuales
CREATE OR REPLACE FUNCTION public.generate_load_percentage_deductions_v2(
  period_calculation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_record RECORD;
  driver_id UUID;
  company_id UUID;
  leasing_expense_type_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  total_leasing NUMERIC := 0;
  total_factoring NUMERIC := 0;
  total_dispatching NUMERIC := 0;
  load_count INTEGER := 0;
  total_amount NUMERIC := 0;
BEGIN
  -- Get period, company and driver info
  SELECT 
    dpc.*, 
    cpp.period_start_date, 
    cpp.period_end_date, 
    cpp.company_id
  INTO period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Calculation not found');
  END IF;
  
  driver_id := period_record.driver_user_id;
  company_id := period_record.company_id;
  
  -- Get expense type IDs
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee';
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee';
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee';
  
  -- ✅ CALCULAR DESCUENTOS DE TODAS LAS CARGAS DEL CONDUCTOR EN EL PERÍODO
  -- Incluye cargas con payment_period_id asignado Y cargas creadas en el rango de fechas
  WITH driver_loads AS (
    SELECT 
      l.id,
      l.total_amount,
      COALESCE(l.leasing_percentage, oo.leasing_percentage, c.default_leasing_percentage, 0) as leasing_pct,
      COALESCE(l.factoring_percentage, oo.factoring_percentage, c.default_factoring_percentage, 0) as factoring_pct,
      COALESCE(l.dispatching_percentage, oo.dispatching_percentage, c.default_dispatching_percentage, 0) as dispatching_pct
    FROM loads l
    LEFT JOIN owner_operators oo 
      ON oo.user_id = driver_id AND oo.is_active = true
    LEFT JOIN companies c 
      ON c.id = company_id
    WHERE l.driver_user_id = driver_id
      AND l.status IN ('created', 'assigned', 'in_transit', 'delivered', 'completed')
      AND (
        -- Cargas asignadas al período
        l.payment_period_id = period_record.company_payment_period_id
        OR
        -- Cargas creadas en el rango de fechas del período
        (l.created_at >= period_record.period_start_date AND l.created_at <= period_record.period_end_date + interval '1 day')
      )
  )
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(total_amount * leasing_pct / 100), 0),
    COALESCE(SUM(total_amount * factoring_pct / 100), 0),
    COALESCE(SUM(total_amount * dispatching_pct / 100), 0)
  INTO load_count, total_amount, total_leasing, total_factoring, total_dispatching
  FROM driver_loads;
  
  -- ✅ ELIMINAR DESCUENTOS PORCENTUALES EXISTENTES PARA EVITAR DUPLICADOS
  DELETE FROM expense_instances 
  WHERE payment_period_id = period_calculation_id
    AND expense_type_id IN (leasing_expense_type_id, factoring_expense_type_id, dispatching_expense_type_id);
  
  -- ✅ INSERTAR NUEVOS DESCUENTOS PORCENTUALES
  -- Leasing deduction
  IF leasing_expense_type_id IS NOT NULL AND total_leasing > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      leasing_expense_type_id,
      driver_id,
      total_leasing,
      format('Leasing fees on $%s from %s loads (%s to %s)', 
        total_amount, load_count, period_record.period_start_date, period_record.period_end_date),
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    );
  END IF;
  
  -- Factoring deduction
  IF factoring_expense_type_id IS NOT NULL AND total_factoring > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      factoring_expense_type_id,
      driver_id,
      total_factoring,
      format('Factoring fees on $%s from %s loads (%s to %s)', 
        total_amount, load_count, period_record.period_start_date, period_record.period_end_date),
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    );
  END IF;
  
  -- Dispatching deduction
  IF dispatching_expense_type_id IS NOT NULL AND total_dispatching > 0 THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      dispatching_expense_type_id,
      driver_id,
      total_dispatching,
      format('Dispatching fees on $%s from %s loads (%s to %s)', 
        total_amount, load_count, period_record.period_start_date, period_record.period_end_date),
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Percentage deductions calculated successfully',
    'driver_id', driver_id,
    'period_id', period_record.company_payment_period_id,
    'load_count', load_count,
    'total_amount', total_amount,
    'leasing_deduction', total_leasing,
    'factoring_deduction', total_factoring,
    'dispatching_deduction', total_dispatching
  );
END;
$$;

-- 3. Función mejorada para calcular período completo del conductor
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_v2(period_calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_record RECORD;
  driver_id UUID;
  company_id UUID;
  gross_earnings NUMERIC := 0;
  fuel_expenses NUMERIC := 0;
  total_deductions NUMERIC := 0;
  other_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  total_income NUMERIC := 0;
  has_negative_balance BOOLEAN := false;
  deduction_result JSONB;
BEGIN
  -- Get period info
  SELECT 
    dpc.*, 
    cpp.period_start_date, 
    cpp.period_end_date, 
    cpp.company_id
  INTO period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Calculation not found');
  END IF;
  
  driver_id := period_record.driver_user_id;
  company_id := period_record.company_id;
  
  -- ✅ 1. CALCULAR GROSS EARNINGS (suma de todas las cargas)
  SELECT COALESCE(SUM(l.total_amount), 0) INTO gross_earnings
  FROM loads l
  WHERE l.driver_user_id = driver_id
    AND l.status IN ('created', 'assigned', 'in_transit', 'delivered', 'completed')
    AND (
      l.payment_period_id = period_record.company_payment_period_id
      OR
      (l.created_at >= period_record.period_start_date AND l.created_at <= period_record.period_end_date + interval '1 day')
    );
  
  -- ✅ 2. CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = driver_id
    AND fe.payment_period_id = period_calculation_id;
  
  -- ✅ 3. CALCULAR OTHER INCOME
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income
  FROM other_income oi
  WHERE oi.driver_user_id = driver_id
    AND oi.payment_period_id = period_calculation_id;
  
  -- ✅ 4. GENERAR DESCUENTOS PORCENTUALES PRIMERO
  SELECT generate_load_percentage_deductions_v2(period_calculation_id) INTO deduction_result;
  
  -- ✅ 5. CALCULAR TOTAL DEDUCTIONS (incluyendo los porcentuales recién generados)
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
  
  -- ✅ 6. CALCULAR TOTALES FINALES
  total_income := gross_earnings + other_income;
  net_payment := total_income - fuel_expenses - total_deductions;
  has_negative_balance := net_payment < 0;
  
  -- ✅ 7. ACTUALIZAR EL REGISTRO DE CÁLCULO
  UPDATE driver_period_calculations SET
    gross_earnings = calculate_driver_payment_period_v2.gross_earnings,
    fuel_expenses = calculate_driver_payment_period_v2.fuel_expenses,
    total_deductions = calculate_driver_payment_period_v2.total_deductions,
    other_income = calculate_driver_payment_period_v2.other_income,
    total_income = calculate_driver_payment_period_v2.total_income,
    net_payment = calculate_driver_payment_period_v2.net_payment,
    has_negative_balance = calculate_driver_payment_period_v2.has_negative_balance,
    calculated_at = now(),
    calculated_by = auth.uid(),
    updated_at = now()
  WHERE id = period_calculation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Driver payment period calculated successfully',
    'calculation_id', period_calculation_id,
    'driver_id', driver_id,
    'gross_earnings', gross_earnings,
    'fuel_expenses', fuel_expenses,
    'total_deductions', total_deductions,
    'other_income', other_income,
    'total_income', total_income,
    'net_payment', net_payment,
    'has_negative_balance', has_negative_balance,
    'deduction_details', deduction_result
  );
END;
$$;

-- 4. Trigger mejorado para recalcular cuando cambian las cargas
CREATE OR REPLACE FUNCTION public.trigger_smart_payment_recalculation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculation_id UUID;
  recalc_result JSONB;
BEGIN
  -- Solo procesar si hay driver y payment_period_id
  IF NEW.driver_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Encontrar el cálculo del conductor para este período
  IF NEW.payment_period_id IS NOT NULL THEN
    SELECT dpc.id INTO calculation_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.driver_user_id = NEW.driver_user_id
      AND cpp.id = NEW.payment_period_id
      AND NOT cpp.is_locked;
  ELSE
    -- Si no tiene payment_period_id, buscar por fecha de creación
    SELECT dpc.id INTO calculation_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.driver_user_id = NEW.driver_user_id
      AND NEW.created_at >= cpp.period_start_date 
      AND NEW.created_at <= cpp.period_end_date + interval '1 day'
      AND NOT cpp.is_locked
    LIMIT 1;
  END IF;
  
  -- Si encontramos el cálculo, recalcular
  IF calculation_id IS NOT NULL THEN
    SELECT calculate_driver_payment_period_v2(calculation_id) INTO recalc_result;
    RAISE NOTICE 'Auto-recalculated payment period %: %', calculation_id, recalc_result->>'message';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Crear el trigger optimizado
DROP TRIGGER IF EXISTS trigger_smart_recalculation ON loads;
CREATE TRIGGER trigger_smart_recalculation
  AFTER INSERT OR UPDATE OF total_amount, driver_user_id, payment_period_id, status
  ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_smart_payment_recalculation();