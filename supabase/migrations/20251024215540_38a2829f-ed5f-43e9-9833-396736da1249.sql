-- Fix remaining functions that reference ei.description column

-- 1. Fix cleanup_incorrect_recurring_instances
CREATE OR REPLACE FUNCTION public.cleanup_incorrect_recurring_instances(period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  period_month_week INTEGER;
  instances_deleted INTEGER := 0;
  instance_record RECORD;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener información del período
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período no encontrado'
    );
  END IF;
  
  -- Calcular qué semana del mes es
  period_month_week := CASE 
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 1 AND 7 THEN 1
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 8 AND 14 THEN 2
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 15 AND 21 THEN 3
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 22 AND 28 THEN 4
    ELSE 5
  END;
  
  -- Identificar y eliminar instancias incorrectas
  FOR instance_record IN
    SELECT 
      ei.id,
      ei.user_id,
      ei.amount,
      ert.frequency,
      ert.month_week,
      ert.id as template_id
    FROM expense_instances ei
    JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
    JOIN expense_recurring_templates ert ON ei.recurring_template_id = ert.id
    WHERE dpc.company_payment_period_id = period_id
    AND ei.recurring_template_id IS NOT NULL
  LOOP
    DECLARE
      should_exist BOOLEAN := false;
    BEGIN
      -- Validar si esta instancia debería existir según la lógica de frecuencia
      CASE instance_record.frequency
        WHEN 'weekly' THEN
          should_exist := true;
        WHEN 'biweekly' THEN
          should_exist := (instance_record.month_week = 1 AND period_month_week IN (1, 2)) OR
                         (instance_record.month_week = 2 AND period_month_week IN (3, 4, 5));
        WHEN 'monthly' THEN
          should_exist := instance_record.month_week = period_month_week;
      END CASE;
      
      -- Si no debería existir, eliminarla
      IF NOT should_exist THEN
        DELETE FROM expense_instances WHERE id = instance_record.id;
        instances_deleted := instances_deleted + 1;
        
        RAISE NOTICE 'Deleted incorrect instance: Template % (%-week %) from period week %', 
          instance_record.template_id, instance_record.frequency, instance_record.month_week, period_month_week;
      END IF;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Cleaned %s incorrect instances from period week %', instances_deleted, period_month_week),
    'instances_deleted', instances_deleted,
    'period_month_week', period_month_week,
    'period_id', period_id
  );
END;
$function$;

-- 2. Fix cleanup_load_percentage_deductions
-- This function now identifies percentage deductions by expense_type category instead of description
CREATE OR REPLACE FUNCTION public.cleanup_load_percentage_deductions(load_id_param uuid, load_number_param text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  v_load_date DATE;
  v_driver_id UUID;
BEGIN
  -- Get load info
  SELECT delivery_date, driver_user_id INTO v_load_date, v_driver_id
  FROM loads
  WHERE id = load_id_param;
  
  IF v_load_date IS NULL OR v_driver_id IS NULL THEN
    RAISE LOG 'Load not found or missing date/driver: %', load_id_param;
    RETURN 0;
  END IF;
  
  -- Delete percentage deductions that match the load date and driver
  -- These are created automatically when a load is created, so we identify them by:
  -- 1. expense_type category = 'percentage_deduction'
  -- 2. Same expense_date as load delivery_date
  -- 3. Same user_id as load driver
  DELETE FROM expense_instances ei
  WHERE ei.user_id = v_driver_id
    AND ei.expense_date = v_load_date
    AND ei.expense_type_id IN (
      SELECT id FROM expense_types 
      WHERE category = 'percentage_deduction'
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE LOG 'Cleaned up % percentage deductions for load #%', deleted_count, load_number_param;
  RETURN deleted_count;
END;
$function$;

-- 3. Fix get_payment_period_elements
CREATE OR REPLACE FUNCTION public.get_payment_period_elements(period_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  loads_data JSONB;
  fuel_expenses_data JSONB;
  expense_instances_data JSONB;
  other_income_data JSONB;
BEGIN
  -- Obtener cargas
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'load_number', l.load_number,
      'total_amount', l.total_amount,
      'pickup_date', l.pickup_date,
      'delivery_date', l.delivery_date,
      'status', l.status,
      'commodity', l.commodity,
      'broker_name', cb.name
    )
  ) INTO loads_data
  FROM public.loads l
  LEFT JOIN public.company_brokers cb ON l.broker_id = cb.id
  WHERE l.payment_period_id = period_id_param;
  
  -- Obtener gastos de combustible
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', fe.id,
      'total_amount', fe.total_amount,
      'gallons_purchased', fe.gallons_purchased,
      'transaction_date', fe.transaction_date,
      'station_name', fe.station_name,
      'status', fe.status
    )
  ) INTO fuel_expenses_data
  FROM public.fuel_expenses fe
  WHERE fe.payment_period_id = period_id_param;
  
  -- Obtener instancias de gastos (CORREGIDO: usar notes en lugar de description)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ei.id,
      'amount', ei.amount,
      'notes', ei.notes,
      'expense_date', ei.expense_date,
      'status', ei.status,
      'expense_type_name', et.name
    )
  ) INTO expense_instances_data
  FROM public.expense_instances ei
  LEFT JOIN public.expense_types et ON ei.expense_type_id = et.id
  WHERE ei.payment_period_id = period_id_param;
  
  -- Obtener otros ingresos
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'amount', oi.amount,
      'description', oi.description,
      'income_date', oi.income_date,
      'income_type', oi.income_type,
      'status', oi.status
    )
  ) INTO other_income_data
  FROM public.other_income oi
  WHERE oi.payment_period_id = period_id_param;
  
  -- Construir resultado final
  SELECT jsonb_build_object(
    'period_id', period_id_param,
    'loads', COALESCE(loads_data, '[]'::jsonb),
    'fuel_expenses', COALESCE(fuel_expenses_data, '[]'::jsonb),
    'expense_instances', COALESCE(expense_instances_data, '[]'::jsonb),
    'other_income', COALESCE(other_income_data, '[]'::jsonb)
  ) INTO result;
  
  RETURN result;
END;
$function$;