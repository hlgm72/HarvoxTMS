-- Simplificar las descripciones de las deducciones automáticas de porcentajes
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
  
  -- ✅ CALCULAR DESCUENTOS - FIX: Fully qualify ALL column references
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
    COALESCE(SUM(dl.total_amount), 0),
    COALESCE(SUM(dl.total_amount * dl.leasing_pct / 100), 0),
    COALESCE(SUM(dl.total_amount * dl.factoring_pct / 100), 0),
    COALESCE(SUM(dl.total_amount * dl.dispatching_pct / 100), 0)
  INTO load_count, total_amount, total_leasing, total_factoring, total_dispatching
  FROM driver_loads dl;
  
  -- ✅ ELIMINAR DESCUENTOS PORCENTUALES EXISTENTES PARA EVITAR DUPLICADOS
  DELETE FROM expense_instances 
  WHERE payment_period_id = period_calculation_id
    AND expense_type_id IN (leasing_expense_type_id, factoring_expense_type_id, dispatching_expense_type_id);
  
  -- ✅ INSERTAR NUEVOS DESCUENTOS PORCENTUALES CON DESCRIPCIONES SIMPLIFICADAS
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
      'Factoring fees',
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
      'Dispatching fees',
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