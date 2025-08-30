-- Create function to automatically assign payment period to loads based on delivery date
CREATE OR REPLACE FUNCTION public.auto_assign_payment_period_to_load(
  load_delivery_date DATE,
  company_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigned_period_id UUID;
BEGIN
  -- Find the payment period that contains the delivery date
  SELECT id INTO assigned_period_id
  FROM company_payment_periods
  WHERE company_id = company_id_param
    AND period_start_date <= load_delivery_date
    AND period_end_date >= load_delivery_date
    AND status = 'open'
  ORDER BY period_start_date DESC
  LIMIT 1;
  
  RETURN assigned_period_id;
END;
$$;

-- Update simple_load_operation function to auto-assign payment periods
CREATE OR REPLACE FUNCTION public.simple_load_operation(
  operation_type TEXT,
  load_data JSONB,
  load_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load RECORD;
  operation_message TEXT;
  load_number_text TEXT;
  delivery_date_value DATE;
  auto_period_id UUID;
  final_period_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Error en operación de carga: Usuario no autenticado';
  END IF;

  -- Extract driver_user_id to get company_id
  IF load_data->>'driver_user_id' IS NULL THEN
    RAISE EXCEPTION 'Error en operación de carga: driver_user_id es requerido';
  END IF;

  -- Get company_id from driver's user_company_roles
  SELECT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = (load_data->>'driver_user_id')::UUID
    AND ucr.role = 'driver'
    AND ucr.is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Error en operación de carga: No se pudo determinar la empresa del conductor';
  END IF;

  -- Validate user permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = target_company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Error en operación de carga: Sin permisos para esta operación';
  END IF;

  -- Extract load number for duplicate check
  load_number_text := load_data->>'load_number';
  IF load_number_text IS NULL OR trim(load_number_text) = '' THEN
    RAISE EXCEPTION 'Error en operación de carga: Número de carga es requerido';
  END IF;

  -- Check for duplicate load number
  IF operation_type = 'CREATE' THEN
    IF EXISTS (
      SELECT 1 FROM loads load_table
      JOIN user_company_roles ucr ON load_table.driver_user_id = ucr.user_id
      WHERE ucr.company_id = target_company_id
      AND load_table.load_number = load_number_text
    ) THEN
      RAISE EXCEPTION 'Error en operación de carga: El número de carga % ya existe', load_number_text;
    END IF;
  ELSIF operation_type = 'UPDATE' AND load_id_param IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM loads load_table
      JOIN user_company_roles ucr ON load_table.driver_user_id = ucr.user_id
      WHERE ucr.company_id = target_company_id
      AND load_table.load_number = load_number_text
      AND load_table.id != load_id_param
    ) THEN
      RAISE EXCEPTION 'Error en operación de carga: El número de carga % ya existe', load_number_text;
    END IF;
  END IF;

  -- AUTO-ASSIGN PAYMENT PERIOD based on delivery date
  -- Extract delivery date from stops data (find delivery stop)
  SELECT (stop_data->>'scheduled_date')::DATE INTO delivery_date_value
  FROM jsonb_array_elements(load_data->'stops') AS stop_data
  WHERE stop_data->>'stop_type' = 'delivery'
  ORDER BY (stop_data->>'stop_number')::INTEGER
  LIMIT 1;
  
  -- If we have a delivery date, try to auto-assign period
  IF delivery_date_value IS NOT NULL THEN
    auto_period_id := auto_assign_payment_period_to_load(delivery_date_value, target_company_id);
  END IF;
  
  -- Use provided period_id or fall back to auto-assigned period
  final_period_id := COALESCE(
    NULLIF((load_data->>'payment_period_id'), '')::UUID,
    auto_period_id
  );

  -- Perform the operation
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number,
      po_number,
      client_id,
      client_contact_id,
      commodity,
      weight_lbs,
      total_amount,
      status,
      driver_user_id,
      internal_dispatcher_id,
      payment_period_id,
      leasing_percentage,
      factoring_percentage,
      dispatching_percentage,
      notes,
      customer_name,
      created_by,
      pickup_date,
      delivery_date
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF((load_data->>'client_id'), '')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      load_data->>'commodity',
      NULLIF((load_data->>'weight'), '')::INTEGER,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'status', 'created'),
      (load_data->>'driver_user_id')::UUID,
      NULLIF((load_data->>'internal_dispatcher_user_id'), '')::UUID,
      final_period_id,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF(load_data->>'notes', ''),
      NULLIF(load_data->>'customer_name', ''),
      current_user_id,
      -- Extract pickup date from stops
      (SELECT (stop_data->>'scheduled_date')::DATE
       FROM jsonb_array_elements(load_data->'stops') AS stop_data
       WHERE stop_data->>'stop_type' = 'pickup'
       ORDER BY (stop_data->>'stop_number')::INTEGER
       LIMIT 1),
      delivery_date_value
    ) RETURNING * INTO result_load;
    
    operation_message := 'Carga creada exitosamente';

  ELSIF operation_type = 'UPDATE' AND load_id_param IS NOT NULL THEN
    -- Check if load exists
    IF NOT EXISTS (
      SELECT 1 FROM loads load_table
      WHERE load_table.id = load_id_param
    ) THEN
      RAISE EXCEPTION 'Error en operación de carga: Carga no encontrada';
    END IF;

    UPDATE loads SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      client_id = NULLIF((load_data->>'client_id'), '')::UUID,
      client_contact_id = NULLIF((load_data->>'client_contact_id'), '')::UUID,
      commodity = load_data->>'commodity',
      weight_lbs = NULLIF((load_data->>'weight'), '')::INTEGER,
      total_amount = (load_data->>'total_amount')::NUMERIC,
      status = COALESCE(load_data->>'status', status),
      driver_user_id = (load_data->>'driver_user_id')::UUID,
      internal_dispatcher_id = NULLIF((load_data->>'internal_dispatcher_user_id'), '')::UUID,
      payment_period_id = final_period_id,
      leasing_percentage = NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      factoring_percentage = NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      dispatching_percentage = NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      notes = NULLIF(load_data->>'notes', ''),
      customer_name = NULLIF(load_data->>'customer_name', ''),
      updated_at = now(),
      pickup_date = (SELECT (stop_data->>'scheduled_date')::DATE
                     FROM jsonb_array_elements(load_data->'stops') AS stop_data
                     WHERE stop_data->>'stop_type' = 'pickup'
                     ORDER BY (stop_data->>'stop_number')::INTEGER
                     LIMIT 1),
      delivery_date = delivery_date_value
    WHERE id = load_id_param
    RETURNING * INTO result_load;
    
    operation_message := 'Carga actualizada exitosamente';

  ELSE
    RAISE EXCEPTION 'Error en operación de carga: Tipo de operación inválida';
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', operation_message,
    'load', row_to_json(result_load),
    'auto_assigned_period', auto_period_id IS NOT NULL,
    'period_assignment_method', CASE 
      WHEN (load_data->>'payment_period_id') IS NOT NULL AND (load_data->>'payment_period_id') != '' 
      THEN 'manual'
      WHEN auto_period_id IS NOT NULL 
      THEN 'automatic'
      ELSE 'none'
    END,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$$;