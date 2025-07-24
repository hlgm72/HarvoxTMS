-- Función para calcular automáticamente un período de pago por conductor
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(
  driver_calculation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calc_record RECORD;
  period_record RECORD;
  gross_income NUMERIC := 0;
  other_income NUMERIC := 0;
  total_income NUMERIC := 0;
  total_deductions NUMERIC := 0;
  current_balance NUMERIC := 0;
  expense_record RECORD;
  applied_expenses INTEGER := 0;
  deferred_expenses INTEGER := 0;
  alert_message TEXT := '';
  has_negative BOOLEAN := false;
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
  
  -- 1. CALCULAR INGRESOS BRUTOS (cargas)
  SELECT COALESCE(SUM(
    l.total_amount - 
    COALESCE(l.total_amount * l.factoring_percentage / 100, 0) -
    COALESCE(l.total_amount * l.dispatching_percentage / 100, 0) -
    COALESCE(l.total_amount * l.leasing_percentage / 100, 0)
  ), 0) INTO gross_income
  FROM public.loads l
  WHERE l.driver_user_id = calc_record.driver_user_id
  AND l.pickup_date >= period_record.period_start_date
  AND l.delivery_date <= period_record.period_end_date
  AND l.status IN ('delivered', 'completed');
  
  -- 2. CALCULAR OTROS INGRESOS
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income
  FROM public.other_income oi
  WHERE oi.driver_user_id = calc_record.driver_user_id
  AND oi.income_date >= period_record.period_start_date
  AND oi.income_date <= period_record.period_end_date
  AND oi.status = 'approved';
  
  -- 3. CALCULAR INGRESOS TOTALES
  total_income := gross_income + other_income;
  current_balance := total_income;
  
  -- 4. APLICAR GASTOS POR PRIORIDAD
  -- Primero gastos críticos (siempre se aplican)
  FOR expense_record IN 
    SELECT * FROM public.expense_instances ei
    WHERE ei.payment_period_id = driver_calculation_id
    AND ei.status = 'planned'
    AND ei.is_critical = true
    ORDER BY ei.priority ASC, ei.amount ASC
  LOOP
    total_deductions := total_deductions + expense_record.amount;
    current_balance := current_balance - expense_record.amount;
    
    UPDATE public.expense_instances 
    SET status = 'applied', applied_at = now(), applied_by = auth.uid()
    WHERE id = expense_record.id;
    
    applied_expenses := applied_expenses + 1;
  END LOOP;
  
  -- Luego gastos normales (mientras haya balance positivo)
  FOR expense_record IN 
    SELECT * FROM public.expense_instances ei
    WHERE ei.payment_period_id = driver_calculation_id
    AND ei.status = 'planned'
    AND ei.is_critical = false
    ORDER BY ei.priority ASC, ei.amount ASC
  LOOP
    IF current_balance >= expense_record.amount THEN
      -- Aplicar el gasto
      total_deductions := total_deductions + expense_record.amount;
      current_balance := current_balance - expense_record.amount;
      
      UPDATE public.expense_instances 
      SET status = 'applied', applied_at = now(), applied_by = auth.uid()
      WHERE id = expense_record.id;
      
      applied_expenses := applied_expenses + 1;
    ELSE
      -- Diferir el gasto
      UPDATE public.expense_instances 
      SET status = 'deferred'
      WHERE id = expense_record.id;
      
      deferred_expenses := deferred_expenses + 1;
    END IF;
  END LOOP;
  
  -- 5. VERIFICAR BALANCE NEGATIVO Y GENERAR ALERTAS
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
  
  -- 6. ACTUALIZAR EL CÁLCULO
  UPDATE public.driver_period_calculations 
  SET 
    gross_earnings = gross_income,
    other_income = other_income,
    total_income = total_income,
    total_deductions = total_deductions,
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
    'gross_earnings', gross_income,
    'other_income', other_income,
    'total_income', total_income,
    'total_deductions', total_deductions,
    'net_payment', current_balance,
    'has_negative_balance', has_negative,
    'applied_expenses', applied_expenses,
    'deferred_expenses', deferred_expenses,
    'alert_message', alert_message
  );
END;
$$;