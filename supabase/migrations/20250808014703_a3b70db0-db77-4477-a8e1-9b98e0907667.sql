-- Fix ambiguous column references in calculate_driver_payment_period_with_validation function
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
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get the calculation record with permission validation
  SELECT dpc.*, cpp.company_id, cpp.period_start_date, cpp.period_end_date
  INTO calculation_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE dpc.id = period_calculation_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true
  AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado o sin permisos para acceder';
  END IF;

  -- Start atomic calculation process
  
  -- ================================
  -- 1. CALCULATE LOADS TOTAL (INCLUYE ASIGNADAS Y COMPLETADAS)
  -- ================================
  -- Cargas completadas (100% del valor) - con alias
  SELECT COALESCE(SUM(l.total_amount), 0) INTO completed_loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status = 'completed';
  
  -- Cargas asignadas (100% del valor para mostrar expectativa) - con alias
  SELECT COALESCE(SUM(l.total_amount), 0) INTO assigned_loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status IN ('assigned', 'in_transit');
  
  -- Total de ingresos brutos (cargas completadas + asignadas)
  total_loads := completed_loads_total + assigned_loads_total;
  
  -- ================================
  -- 2. CALCULATE FUEL EXPENSES TOTAL
  -- ================================
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_total
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = period_calculation_id;
  
  -- ================================
  -- 3. CALCULATE DEDUCTIONS TOTAL
  -- ================================
  SELECT COALESCE(SUM(ei.amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_calculation_id
  AND ei.status = 'applied';
  
  -- ================================
  -- 4. CALCULATE OTHER INCOME TOTAL
  -- ================================
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income_total
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = period_calculation_id
  AND oi.status = 'approved';
  
  -- ================================
  -- 5. GENERATE PERCENTAGE DEDUCTIONS
  -- ================================
  PERFORM generate_load_percentage_deductions(NULL, period_calculation_id);
  
  -- Recalculate deductions after percentage deductions - con alias
  SELECT COALESCE(SUM(ei.amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_calculation_id
  AND ei.status = 'applied';
  
  -- ================================
  -- 6. CALCULATE FINAL TOTALS
  -- ================================
  total_income := total_loads + other_income_total;
  net_payment := total_income - fuel_total - deductions_total;
  has_negative := net_payment < 0;
  
  -- ================================
  -- 7. UPDATE CALCULATION RECORD ATOMICALLY
  -- ================================
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_loads,  -- Ahora incluye cargas asignadas
    fuel_expenses = fuel_total,
    total_deductions = deductions_total,
    other_income = other_income_total,
    total_income = total_income,
    net_payment = net_payment,
    has_negative_balance = has_negative,
    payment_status = CASE 
      WHEN has_negative THEN 'needs_review'
      WHEN assigned_loads_total > 0 AND completed_loads_total = 0 THEN 'projected'
      WHEN assigned_loads_total > 0 AND completed_loads_total > 0 THEN 'partial'
      ELSE 'calculated'
    END,
    calculated_at = now(),
    calculated_by = current_user_id,
    updated_at = now()
  WHERE id = period_calculation_id;
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período calculado exitosamente con cargas asignadas incluidas',
    'calculation_id', period_calculation_id,
    'totals', jsonb_build_object(
      'completed_loads', completed_loads_total,
      'assigned_loads', assigned_loads_total,
      'total_loads', total_loads,
      'fuel_expenses', fuel_total,
      'deductions', deductions_total,
      'other_income', other_income_total,
      'total_income', total_income,
      'net_payment', net_payment,
      'has_negative_balance', has_negative
    ),
    'calculated_by', current_user_id,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en cálculo ACID del período: %', SQLERRM;
END;
$function$;