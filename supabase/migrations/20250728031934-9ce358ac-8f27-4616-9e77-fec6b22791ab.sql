-- Refactorización: Eliminar campo redundante net_payment
-- net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions (calculado dinámicamente)

-- 1. Actualizar función calculate_driver_payment_period para no usar net_payment
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
  calculated_net_payment NUMERIC := 0;
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
  
  -- 4. CALCULAR BALANCE INICIAL PARA APLICAR DEDUCCIONES
  calculated_net_payment := gross_income_amount + other_income_amount - fuel_expenses_amount;
  
  -- 5. APLICAR GASTOS POR PRIORIDAD
  FOR expense_record IN 
    SELECT * FROM public.expense_instances ei
    WHERE ei.payment_period_id = driver_calculation_id
    AND ei.status = 'planned'
    AND ei.is_critical = true
    ORDER BY ei.priority ASC, ei.amount ASC
  LOOP
    total_deductions_amount := total_deductions_amount + expense_record.amount;
    calculated_net_payment := calculated_net_payment - expense_record.amount;
    
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
    IF calculated_net_payment >= expense_record.amount THEN
      total_deductions_amount := total_deductions_amount + expense_record.amount;
      calculated_net_payment := calculated_net_payment - expense_record.amount;
      
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
  IF calculated_net_payment < 0 THEN
    has_negative := true;
    alert_message := 'Balance negativo: $' || ABS(calculated_net_payment)::TEXT || 
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
  
  -- 7. ACTUALIZAR EL CÁLCULO (sin net_payment almacenado)
  UPDATE public.driver_period_calculations 
  SET 
    gross_earnings = gross_income_amount,
    other_income = other_income_amount,
    fuel_expenses = fuel_expenses_amount,
    total_deductions = total_deductions_amount,
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
    'total_income', gross_income_amount + other_income_amount, -- Para retrocompatibilidad
    'total_deductions', total_deductions_amount,
    'net_payment', calculated_net_payment, -- Calculado dinámicamente para retrocompatibilidad
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
    calculated_gross_earnings NUMERIC;
    calculated_fuel_expenses NUMERIC;
    calculated_total_deductions NUMERIC;
    calculated_other_income NUMERIC;
    calculated_net_payment NUMERIC;
    calculated_has_negative_balance BOOLEAN;
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
        -- Calcular cada componente
        SELECT COALESCE(SUM(total_amount), 0) INTO calculated_gross_earnings
        FROM loads 
        WHERE payment_period_id = period_id 
          AND driver_user_id = driver_record.driver_user_id;
          
        SELECT COALESCE(SUM(total_amount), 0) INTO calculated_fuel_expenses
        FROM fuel_expenses 
        WHERE payment_period_id = period_id 
          AND driver_user_id = driver_record.driver_user_id;
          
        SELECT COALESCE(SUM(amount), 0) INTO calculated_other_income
        FROM other_income 
        WHERE payment_period_id = period_id 
          AND driver_user_id = driver_record.driver_user_id;
          
        SELECT COALESCE(SUM(ei.amount), 0) INTO calculated_total_deductions
        FROM expense_instances ei
        JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
        WHERE dpc.company_payment_period_id = period_id 
          AND dpc.driver_user_id = driver_record.driver_user_id;
          
        -- Calcular net_payment dinámicamente
        calculated_net_payment := (calculated_gross_earnings + calculated_other_income) - calculated_fuel_expenses - calculated_total_deductions;
        calculated_has_negative_balance := calculated_net_payment < 0;
        
        -- Insertar o actualizar el cálculo del conductor (sin net_payment almacenado)
        INSERT INTO driver_period_calculations (
            company_payment_period_id,
            driver_user_id,
            gross_earnings,
            fuel_expenses,
            total_deductions,
            other_income,
            has_negative_balance,
            created_at,
            updated_at
        )
        VALUES (
            period_id,
            driver_record.driver_user_id,
            calculated_gross_earnings,
            calculated_fuel_expenses,
            calculated_total_deductions,
            calculated_other_income,
            calculated_has_negative_balance,
            now(),
            now()
        )
        ON CONFLICT (company_payment_period_id, driver_user_id) 
        DO UPDATE SET
            gross_earnings = EXCLUDED.gross_earnings,
            fuel_expenses = EXCLUDED.fuel_expenses,
            total_deductions = EXCLUDED.total_deductions,
            other_income = EXCLUDED.other_income,
            has_negative_balance = EXCLUDED.has_negative_balance,
            updated_at = now();
    END LOOP;
    
    RAISE NOTICE 'Recalculated totals for payment period %', period_id;
END;
$function$;

-- 3. Eliminar la columna net_payment de la tabla
ALTER TABLE public.driver_period_calculations DROP COLUMN IF EXISTS net_payment;