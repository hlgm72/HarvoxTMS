-- Refactorización: Eliminar campo redundante total_income
-- total_income = gross_earnings + other_income (calculado dinámicamente)

-- 1. Actualizar función calculate_driver_payment_period para no usar total_income
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(driver_calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calc_record RECORD;
  period_record RECORD;
  company_record RECORD;
  gross_income_amount NUMERIC := 0;
  other_income_amount NUMERIC := 0;
  fuel_expenses_amount NUMERIC := 0;
  total_deductions_amount NUMERIC := 0;
  current_balance NUMERIC := 0;
  expense_record RECORD;
  applied_expenses INTEGER := 0;
  deferred_expenses INTEGER := 0;
  alert_message TEXT := '';
  has_negative BOOLEAN := false;
  date_field TEXT;
  status_criteria TEXT;
BEGIN
  -- Obtener el cálculo del conductor
  SELECT * INTO calc_record 
  FROM public.driver_period_calculations 
  WHERE id = driver_calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cálculo no encontrado');
  END IF;
  
  -- Obtener información del período de la empresa
  SELECT * INTO period_record 
  FROM public.company_payment_periods 
  WHERE id = calc_record.company_payment_period_id;
  
  -- Obtener configuración de la empresa
  SELECT * INTO company_record
  FROM public.companies
  WHERE id = period_record.company_id;
  
  -- Determinar criterio de fecha y estados a incluir según configuración de empresa
  IF company_record.load_assignment_criteria = 'delivery_date' THEN
    date_field := 'delivery_date';
    status_criteria := 'delivered_completed_only';
  ELSE
    date_field := 'pickup_date';
    status_criteria := 'assigned_and_above';
  END IF;
  
  -- 1. CALCULAR INGRESOS BRUTOS (cargas)
  IF status_criteria = 'delivered_completed_only' THEN
    SELECT COALESCE(SUM(
      l.total_amount - 
      COALESCE(l.total_amount * l.factoring_percentage / 100, 0) -
      COALESCE(l.total_amount * l.dispatching_percentage / 100, 0) -
      COALESCE(l.total_amount * l.leasing_percentage / 100, 0)
    ), 0) INTO gross_income_amount
    FROM public.loads l
    WHERE l.driver_user_id = calc_record.driver_user_id
    AND (
      (date_field = 'pickup_date' AND l.pickup_date >= period_record.period_start_date AND l.pickup_date <= period_record.period_end_date)
      OR
      (date_field = 'delivery_date' AND l.delivery_date >= period_record.period_start_date AND l.delivery_date <= period_record.period_end_date)
    )
    AND l.status IN ('delivered', 'completed');
  ELSE
    SELECT COALESCE(SUM(
      l.total_amount - 
      COALESCE(l.total_amount * l.factoring_percentage / 100, 0) -
      COALESCE(l.total_amount * l.dispatching_percentage / 100, 0) -
      COALESCE(l.total_amount * l.leasing_percentage / 100, 0)
    ), 0) INTO gross_income_amount
    FROM public.loads l
    WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.pickup_date >= period_record.period_start_date
    AND l.pickup_date <= period_record.period_end_date
    AND l.status IN ('assigned', 'in_transit', 'at_pickup', 'loaded', 'delivered', 'completed');
  END IF;
  
  -- 2. CALCULAR OTROS INGRESOS
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income_amount
  FROM public.other_income oi
  WHERE oi.driver_user_id = calc_record.driver_user_id
  AND oi.income_date >= period_record.period_start_date
  AND oi.income_date <= period_record.period_end_date
  AND oi.status = 'approved';
  
  -- 3. CALCULAR GASTOS DE COMBUSTIBLE
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_expenses_amount
  FROM public.fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
  AND fe.payment_period_id = period_record.id
  AND fe.status IN ('pending', 'approved', 'verified');
  
  -- 4. CALCULAR BALANCE INICIAL (gross_earnings + other_income - fuel_expenses)
  current_balance := gross_income_amount + other_income_amount - fuel_expenses_amount;
  
  -- 5. APLICAR GASTOS POR PRIORIDAD
  FOR expense_record IN 
    SELECT * FROM public.expense_instances ei
    WHERE ei.payment_period_id = driver_calculation_id
    AND ei.status = 'planned'
    AND ei.is_critical = true
    ORDER BY ei.priority ASC, ei.amount ASC
  LOOP
    total_deductions_amount := total_deductions_amount + expense_record.amount;
    current_balance := current_balance - expense_record.amount;
    
    UPDATE public.expense_instances 
    SET status = 'applied', applied_at = now(), applied_by = auth.uid()
    WHERE id = expense_record.id;
    
    applied_expenses := applied_expenses + 1;
  END LOOP;
  
  FOR expense_record IN 
    SELECT * FROM public.expense_instances ei
    WHERE ei.payment_period_id = driver_calculation_id
    AND ei.status = 'planned'
    AND ei.is_critical = false
    ORDER BY ei.priority ASC, ei.amount ASC
  LOOP
    IF current_balance >= expense_record.amount THEN
      total_deductions_amount := total_deductions_amount + expense_record.amount;
      current_balance := current_balance - expense_record.amount;
      
      UPDATE public.expense_instances 
      SET status = 'applied', applied_at = now(), applied_by = auth.uid()
      WHERE id = expense_record.id;
      
      applied_expenses := applied_expenses + 1;
    ELSE
      UPDATE public.expense_instances 
      SET status = 'deferred'
      WHERE id = expense_record.id;
      
      deferred_expenses := deferred_expenses + 1;
    END IF;
  END LOOP;
  
  -- 6. VERIFICAR BALANCE NEGATIVO Y GENERAR ALERTAS
  IF current_balance < 0 THEN
    has_negative := true;
    alert_message := 'Balance negativo: $' || ABS(current_balance)::TEXT || 
                    '. Revisar gastos críticos aplicados.';
  END IF;
  
  IF deferred_expenses > 0 THEN
    alert_message := alert_message || 
                    CASE WHEN alert_message != '' THEN ' ' ELSE '' END ||
                    deferred_expenses::TEXT || ' gastos diferidos por insuficiente balance.';
  END IF;
  
  IF status_criteria = 'assigned_and_above' THEN
    alert_message := alert_message || 
                    CASE WHEN alert_message != '' THEN ' ' ELSE '' END ||
                    'Cálculo basado en fecha de recogida (incluye cargas asignadas).';
  END IF;
  
  -- 7. ACTUALIZAR EL CÁLCULO (sin total_income)
  UPDATE public.driver_period_calculations 
  SET 
    gross_earnings = gross_income_amount,
    other_income = other_income_amount,
    fuel_expenses = fuel_expenses_amount,
    total_deductions = total_deductions_amount,
    net_payment = current_balance,
    has_negative_balance = has_negative,
    balance_alert_message = NULLIF(alert_message, ''),
    calculated_at = now(),
    calculated_by = auth.uid(),
    updated_at = now()
  WHERE id = driver_calculation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'driver_calculation_id', driver_calculation_id,
    'gross_earnings', gross_income_amount,
    'other_income', other_income_amount,
    'fuel_expenses', fuel_expenses_amount,
    'total_income', gross_income_amount + other_income_amount, -- Calculado dinámicamente para retrocompatibilidad
    'total_deductions', total_deductions_amount,
    'net_payment', current_balance,
    'has_negative_balance', has_negative,
    'applied_expenses', applied_expenses,
    'deferred_expenses', deferred_expenses,
    'alert_message', alert_message,
    'calculation_criteria', CASE 
      WHEN status_criteria = 'assigned_and_above' THEN 'pickup_date_based'
      ELSE 'delivery_date_based'
    END
  );
END;
$function$;

-- 2. Actualizar función recalculate_payment_period_totals
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    period_record RECORD;
    driver_record RECORD;
BEGIN
    -- Obtener información del período
    SELECT * INTO period_record 
    FROM company_payment_periods 
    WHERE id = period_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment period not found: %', period_id;
    END IF;
    
    -- Para cada conductor que tenga transacciones en este período
    FOR driver_record IN 
        SELECT DISTINCT driver_user_id 
        FROM (
            SELECT driver_user_id FROM loads 
            WHERE payment_period_id = period_id
            UNION
            SELECT driver_user_id FROM fuel_expenses 
            WHERE payment_period_id = period_id
            UNION
            SELECT driver_user_id FROM other_income 
            WHERE payment_period_id = period_id
            UNION
            SELECT ei.driver_user_id FROM expense_instances ei
            JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
            WHERE dpc.company_payment_period_id = period_id
        ) AS all_drivers
    LOOP
        -- Insertar o actualizar el cálculo del conductor (sin total_income)
        INSERT INTO driver_period_calculations (
            company_payment_period_id,
            driver_user_id,
            gross_earnings,
            fuel_expenses,
            total_deductions,
            other_income,
            net_payment,
            has_negative_balance,
            created_at,
            updated_at
        )
        VALUES (
            period_id,
            driver_record.driver_user_id,
            -- Calcular ingresos brutos (loads)
            COALESCE((
                SELECT SUM(total_amount) 
                FROM loads 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Calcular gastos de combustible
            COALESCE((
                SELECT SUM(total_amount) 
                FROM fuel_expenses 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Calcular deducciones (expense_instances)
            COALESCE((
                SELECT SUM(ei.amount) 
                FROM expense_instances ei
                JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
                WHERE dpc.company_payment_period_id = period_id 
                  AND dpc.driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Calcular otros ingresos
            COALESCE((
                SELECT SUM(amount) 
                FROM other_income 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Net payment = (gross_earnings + other_income) - fuel_expenses - total_deductions
            (COALESCE((
                SELECT SUM(total_amount) 
                FROM loads 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) + COALESCE((
                SELECT SUM(amount) 
                FROM other_income 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0)) - COALESCE((
                SELECT SUM(total_amount) 
                FROM fuel_expenses 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) - COALESCE((
                SELECT SUM(ei.amount) 
                FROM expense_instances ei
                JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
                WHERE dpc.company_payment_period_id = period_id 
                  AND dpc.driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Has negative balance
            ((COALESCE((
                SELECT SUM(total_amount) 
                FROM loads 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) + COALESCE((
                SELECT SUM(amount) 
                FROM other_income 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0)) - COALESCE((
                SELECT SUM(total_amount) 
                FROM fuel_expenses 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) - COALESCE((
                SELECT SUM(ei.amount) 
                FROM expense_instances ei
                JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
                WHERE dpc.company_payment_period_id = period_id 
                  AND dpc.driver_user_id = driver_record.driver_user_id
            ), 0)) < 0,
            now(),
            now()
        )
        ON CONFLICT (company_payment_period_id, driver_user_id) 
        DO UPDATE SET
            gross_earnings = EXCLUDED.gross_earnings,
            fuel_expenses = EXCLUDED.fuel_expenses,
            total_deductions = EXCLUDED.total_deductions,
            other_income = EXCLUDED.other_income,
            net_payment = EXCLUDED.net_payment,
            has_negative_balance = EXCLUDED.has_negative_balance,
            updated_at = now();
    END LOOP;
    
    RAISE NOTICE 'Recalculated totals for payment period %', period_id;
END;
$function$;

-- 3. Eliminar la columna total_income de la tabla
ALTER TABLE public.driver_period_calculations DROP COLUMN IF EXISTS total_income;