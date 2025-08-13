-- Drop and recreate the function to fix parameter name issue
DROP FUNCTION IF EXISTS public.generate_load_percentage_deductions(uuid, uuid);

-- Recreate with fixed logic to include loads in date range or with matching payment_period_id
CREATE OR REPLACE FUNCTION public.generate_load_percentage_deductions(
  period_calculation_id uuid,
  load_id_param uuid DEFAULT NULL
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
  
  -- ✅ CRITICAL FIX: Include loads in date range OR with matching payment_period_id
  -- This ensures that newly created/duplicated loads (which may not have payment_period_id assigned yet)
  -- are included in the calculation based on their creation date
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
    ON oo.user_id = driver_id AND oo.is_active = true
  LEFT JOIN companies c 
    ON c.id = company_id
  WHERE l.driver_user_id = driver_id
    AND (load_id_param IS NULL OR l.id = load_id_param)
    AND l.status IN ('created', 'assigned', 'in_transit', 'delivered', 'completed')
    AND (
      -- Include loads assigned to this payment period
      l.payment_period_id = period_record.company_payment_period_id
      OR
      -- Include loads created during the period (for newly created loads without payment_period_id)
      (l.payment_period_id IS NULL AND l.created_at >= period_record.period_start_date AND l.created_at <= period_record.period_end_date + interval '1 day')
    );
  
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