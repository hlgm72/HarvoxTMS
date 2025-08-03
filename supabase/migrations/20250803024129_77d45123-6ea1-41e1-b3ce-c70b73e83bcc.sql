-- Reemplazar la función para generar deducciones consolidadas por período
CREATE OR REPLACE FUNCTION public.generate_load_percentage_deductions(load_id_param uuid, period_calculation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  driver_id UUID;
  leasing_expense_type_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  total_leasing NUMERIC := 0;
  total_factoring NUMERIC := 0;
  total_dispatching NUMERIC := 0;
BEGIN
  -- Obtener información del período
  SELECT dpc.*, cpp.period_start_date, cpp.period_end_date
  INTO period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  driver_id := period_record.driver_user_id;
  
  -- Obtener IDs de los tipos de expense
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee';
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee';
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee';
  
  -- Calcular totales consolidados de todas las cargas del período
  SELECT 
    COALESCE(SUM(l.total_amount * (COALESCE(l.leasing_percentage, 0) / 100)), 0),
    COALESCE(SUM(l.total_amount * (COALESCE(l.factoring_percentage, 0) / 100)), 0),
    COALESCE(SUM(l.total_amount * (COALESCE(l.dispatching_percentage, 0) / 100)), 0)
  INTO total_leasing, total_factoring, total_dispatching
  FROM loads l
  WHERE l.driver_user_id = driver_id
  AND l.payment_period_id = period_record.company_payment_period_id
  AND l.status = 'completed';
  
  -- Insertar deducción consolidada de leasing si hay monto
  IF total_leasing > 0 AND leasing_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
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
    ON CONFLICT (payment_period_id, expense_type_id, driver_user_id) 
    DO UPDATE SET 
      amount = total_leasing,
      description = 'Leasing fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      updated_at = now();
  END IF;
  
  -- Insertar deducción consolidada de factoring si hay monto
  IF total_factoring > 0 AND factoring_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
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
    ON CONFLICT (payment_period_id, expense_type_id, driver_user_id) 
    DO UPDATE SET 
      amount = total_factoring,
      description = 'Factoring fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      updated_at = now();
  END IF;
  
  -- Insertar deducción consolidada de dispatching si hay monto
  IF total_dispatching > 0 AND dispatching_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
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
    ON CONFLICT (payment_period_id, expense_type_id, driver_user_id) 
    DO UPDATE SET 
      amount = total_dispatching,
      description = 'Dispatching fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      updated_at = now();
  END IF;
  
END;
$function$;

-- Agregar constraint único para evitar duplicados
ALTER TABLE expense_instances 
ADD CONSTRAINT unique_expense_per_period_type_driver 
UNIQUE (payment_period_id, expense_type_id, driver_user_id);