-- Fix deduction calculations to include 'created' loads and ensure recalculation before computing totals

-- 1) Update generator to include status 'created' and support single-load or full-period recompute
CREATE OR REPLACE FUNCTION public.generate_load_percentage_deductions(
  load_id_param uuid,
  period_calculation_id uuid
)
RETURNS void
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
BEGIN
  -- Get period, company and driver info
  SELECT dpc.*, cpp.period_start_date, cpp.period_end_date, cpp.company_id
  INTO period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  driver_id := period_record.driver_user_id;
  company_id := period_record.company_id;
  
  -- Resolve expense type ids
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee';
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee';
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee';
  
  -- Consolidated totals across loads using fallback chain:
  -- load.% -> owner_operators.% -> companies.default_% -> 0
  SELECT 
    COALESCE(SUM(l.total_amount * (
      COALESCE(l.leasing_percentage, oo.leasing_percentage, c.default_leasing_percentage, 0) / 100
    )), 0),
    COALESCE(SUM(l.total_amount * (
      COALESCE(l.factoring_percentage, oo.factoring_percentage, c.default_factoring_percentage, 0) / 100
    )), 0),
    COALESCE(SUM(l.total_amount * (
      COALESCE(l.dispatching_percentage, oo.dispatching_percentage, c.default_dispatching_percentage, 0) / 100
    )), 0)
  INTO total_leasing, total_factoring, total_dispatching
  FROM loads l
  LEFT JOIN owner_operators oo 
    ON oo.user_id = driver_id AND oo.company_id = company_id AND oo.is_active = true
  LEFT JOIN companies c 
    ON c.id = company_id
  WHERE l.driver_user_id = driver_id
    AND l.payment_period_id = period_record.company_payment_period_id
    AND (load_id_param IS NULL OR l.id = load_id_param)
    AND l.status IN ('created', 'assigned', 'in_transit', 'delivered', 'completed');
  
  -- Upsert consolidated leasing deduction
  IF leasing_expense_type_id IS NOT NULL THEN
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
      'Leasing fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT (payment_period_id, expense_type_id, user_id)
    DO UPDATE SET 
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
  
  -- Upsert consolidated factoring deduction
  IF factoring_expense_type_id IS NOT NULL THEN
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
      'Factoring fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT (payment_period_id, expense_type_id, user_id)
    DO UPDATE SET 
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
  
  -- Upsert consolidated dispatching deduction
  IF dispatching_expense_type_id IS NOT NULL THEN
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
      'Dispatching fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT (payment_period_id, expense_type_id, user_id)
    DO UPDATE SET 
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
END;
$$;

-- 2) Ensure validation wrapper recalculates deductions before computing totals
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(
  calculation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calc RECORD;
  period_locked boolean;
  result jsonb;
BEGIN
  SELECT * INTO calc
  FROM public.driver_period_calculations
  WHERE id = calculation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cálculo no encontrado');
  END IF;

  SELECT COALESCE(is_locked, false) INTO period_locked
  FROM public.company_payment_periods
  WHERE id = calc.company_payment_period_id;

  IF period_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período está bloqueado');
  END IF;

  -- Rebuild percentage-based deductions to reflect latest loads/percentages
  PERFORM public.generate_load_percentage_deductions(NULL, calculation_id);

  -- Now compute totals
  SELECT public.calculate_driver_payment_period(calculation_id) INTO result;
  RETURN result;
END;
$$;