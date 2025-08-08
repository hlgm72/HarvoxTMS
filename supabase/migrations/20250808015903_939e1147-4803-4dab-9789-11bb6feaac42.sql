-- Fix ambiguous total_income variable in calculate_driver_payment_period_with_validation function
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(period_calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  completed_loads_total NUMERIC := 0;
  assigned_loads_total NUMERIC := 0;
  total_loads NUMERIC := 0;
  fuel_total NUMERIC := 0;
  deductions_total NUMERIC := 0;
  other_income_total NUMERIC := 0;
  calculated_total_income NUMERIC := 0;  -- Renamed to avoid ambiguity
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  alert_msg TEXT := '';
BEGIN
  -- ================================
  -- 1. VALIDATE INPUT AND GET RECORD
  -- ================================
  IF period_calculation_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'period_calculation_id no puede ser null');
  END IF;

  SELECT * INTO calculation_record
  FROM driver_period_calculations
  WHERE id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Calculation record not found');
  END IF;

  -- ================================
  -- 2. CALCULATE COMPLETED LOADS
  -- ================================
  SELECT COALESCE(SUM(l.total_amount), 0) INTO completed_loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status = 'completed';

  -- ================================
  -- 3. CALCULATE ASSIGNED LOADS (para proyecciones)
  -- ================================
  SELECT COALESCE(SUM(l.total_amount), 0) INTO assigned_loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status IN ('assigned', 'in_transit', 'pickup', 'delivery');

  -- Total de cargas (completadas + asignadas para proyección)
  total_loads := completed_loads_total + assigned_loads_total;

  -- ================================
  -- 4. GENERATE AUTOMATIC DEDUCTIONS
  -- ================================
  PERFORM generate_load_percentage_deductions(null, period_calculation_id);

  -- ================================
  -- 5. CALCULATE FUEL EXPENSES
  -- ================================
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_total
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = period_calculation_id;

  -- ================================
  -- 6. CALCULATE TOTAL DEDUCTIONS
  -- ================================
  SELECT COALESCE(SUM(ei.amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_calculation_id
  AND ei.status = 'applied';

  -- ================================
  -- 7. CALCULATE OTHER INCOME
  -- ================================
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income_total
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = period_calculation_id
  AND oi.status = 'approved';

  -- ================================
  -- 8. CALCULATE TOTALS
  -- ================================
  calculated_total_income := total_loads + other_income_total;
  net_payment := calculated_total_income - fuel_total - deductions_total;
  has_negative := net_payment < 0;

  -- Generate alert message for negative balance
  IF has_negative THEN
    alert_msg := format('Balance negativo: El conductor debe $%.2f', ABS(net_payment));
  END IF;

  -- ================================
  -- 9. UPDATE CALCULATION RECORD ATOMICALLY
  -- ================================
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_loads,  -- Ahora incluye cargas asignadas
    fuel_expenses = fuel_total,
    total_deductions = deductions_total,
    other_income = other_income_total,
    total_income = calculated_total_income,  -- Using renamed variable
    net_payment = net_payment,
    has_negative_balance = has_negative,
    payment_status = CASE 
      WHEN has_negative THEN 'needs_review'
      WHEN assigned_loads_total > 0 AND completed_loads_total = 0 THEN 'projected'
      WHEN assigned_loads_total > 0 AND completed_loads_total > 0 THEN 'partial'
      ELSE 'calculated'
    END,
    balance_alert_message = CASE 
      WHEN has_negative THEN alert_msg 
      ELSE NULL 
    END,
    calculated_at = now(),
    calculated_by = auth.uid(),
    updated_at = now()
  WHERE id = period_calculation_id;

  -- ================================
  -- 10. RETURN SUCCESS RESULT
  -- ================================
  RETURN jsonb_build_object(
    'success', true,
    'period_calculation_id', period_calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'completed_loads_total', completed_loads_total,
    'assigned_loads_total', assigned_loads_total,
    'total_loads', total_loads,
    'fuel_expenses', fuel_total,
    'deductions', deductions_total,
    'other_income', other_income_total,
    'calculated_total_income', calculated_total_income,
    'net_payment', net_payment,
    'has_negative_balance', has_negative,
    'alert_message', CASE WHEN has_negative THEN alert_msg ELSE NULL END,
    'calculation_status', CASE 
      WHEN has_negative THEN 'needs_review'
      WHEN assigned_loads_total > 0 AND completed_loads_total = 0 THEN 'projected'
      WHEN assigned_loads_total > 0 AND completed_loads_total > 0 THEN 'partial'
      ELSE 'calculated'
    END,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en cálculo ACID del período: %', SQLERRM;
END;
$function$;