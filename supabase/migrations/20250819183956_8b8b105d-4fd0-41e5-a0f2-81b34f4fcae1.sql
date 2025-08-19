-- Fix the function to include 'draft' status loads  
CREATE OR REPLACE FUNCTION public.generate_load_percentage_deductions_v2(period_calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  driver_id UUID;
  company_id UUID;
  company_load_criteria TEXT;
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
    cpp.company_id,
    c.load_assignment_criteria
  INTO period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN companies c ON cpp.company_id = c.id
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Calculation not found');
  END IF;
  
  driver_id := period_record.driver_user_id;
  company_id := period_record.company_id;
  company_load_criteria := period_record.load_assignment_criteria;
  
  -- Get expense type IDs
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee';
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee';
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee';
  
  -- Calculate deductions using proper date filtering based on company configuration
  -- Include 'draft' status as these are valid loads for calculation
  SELECT 
    COUNT(l.id),
    COALESCE(SUM(l.total_amount), 0),
    COALESCE(SUM(l.total_amount * COALESCE(l.leasing_percentage, c.default_leasing_percentage, 0) / 100), 0),
    COALESCE(SUM(l.total_amount * COALESCE(l.factoring_percentage, c.default_factoring_percentage, 0) / 100), 0),
    COALESCE(SUM(l.total_amount * COALESCE(l.dispatching_percentage, c.default_dispatching_percentage, 0) / 100), 0)
  INTO load_count, total_amount, total_leasing, total_factoring, total_dispatching
  FROM loads l
  LEFT JOIN companies c ON c.id = company_id
  WHERE l.driver_user_id = driver_id
    AND l.status IN ('draft', 'created', 'assigned', 'in_transit', 'delivered', 'completed')
    AND (
      -- Use company's load assignment criteria to determine date filtering
      CASE 
        WHEN company_load_criteria = 'pickup_date' THEN
          l.pickup_date BETWEEN period_record.period_start_date AND period_record.period_end_date
        WHEN company_load_criteria = 'delivery_date' THEN
          l.delivery_date BETWEEN period_record.period_start_date AND period_record.period_end_date
        ELSE
          -- Default fallback to delivery_date
          l.delivery_date BETWEEN period_record.period_start_date AND period_record.period_end_date
      END
    );
  
  -- Delete existing percentage deductions to avoid duplicates
  DELETE FROM expense_instances 
  WHERE payment_period_id = period_calculation_id
    AND expense_type_id IN (leasing_expense_type_id, factoring_expense_type_id, dispatching_expense_type_id);
  
  -- Insert new percentage deductions
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
      'Leasing fees',
      period_record.period_end_date,
      'applied',
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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
      'Factoring fees',
      period_record.period_end_date,
      'applied',
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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
      'Dispatching fees',
      period_record.period_end_date,
      'applied',
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      now()
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Percentage deductions generated successfully',
    'load_count', load_count,
    'total_amount', total_amount,
    'total_leasing', total_leasing,
    'total_factoring', total_factoring,
    'total_dispatching', total_dispatching,
    'company_criteria', company_load_criteria,
    'driver_id', driver_id,
    'period_start', period_record.period_start_date,
    'period_end', period_record.period_end_date
  );
END;
$function$;