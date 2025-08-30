-- Drop the old function and create the correct new one
DROP FUNCTION IF EXISTS public.simple_load_operation(jsonb);
DROP FUNCTION IF EXISTS public.simple_load_operation(text, jsonb, uuid);

-- Create the correct function with proper parameter handling
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

  -- Perform the operation
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      load_number,
      po_number,
      client_broker_id,
      client_contact_id,
      commodity,
      weight,
      pieces,
      total_amount,
      status,
      driver_user_id,
      internal_dispatcher_user_id,
      payment_period_id,
      leasing_percentage,
      factoring_percentage,
      dispatching_percentage,
      notes,
      created_by,
      updated_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF((load_data->>'client_broker_id'), '')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      load_data->>'commodity',
      NULLIF((load_data->>'weight'), '')::INTEGER,
      NULLIF((load_data->>'pieces'), '')::INTEGER,
      (load_data->>'total_amount')::NUMERIC,
      COALESCE(load_data->>'status', 'created'),
      (load_data->>'driver_user_id')::UUID,
      NULLIF((load_data->>'internal_dispatcher_user_id'), '')::UUID,
      NULLIF((load_data->>'payment_period_id'), '')::UUID,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF(load_data->>'notes', ''),
      current_user_id,
      current_user_id
    ) RETURNING * INTO result_load;
    
    operation_message := 'Carga creada exitosamente';

  ELSIF operation_type = 'UPDATE' AND load_id_param IS NOT NULL THEN
    -- Verify load exists and user has access
    IF NOT EXISTS (
      SELECT 1 FROM loads load_table
      JOIN user_company_roles ucr ON load_table.driver_user_id = ucr.user_id
      WHERE load_table.id = load_id_param
      AND ucr.user_id = current_user_id
      AND ucr.company_id = target_company_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Error en operación de carga: Carga no encontrada o sin permisos';
    END IF;

    UPDATE loads SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      client_broker_id = NULLIF((load_data->>'client_broker_id'), '')::UUID,
      client_contact_id = NULLIF((load_data->>'client_contact_id'), '')::UUID,
      commodity = load_data->>'commodity',
      weight = NULLIF((load_data->>'weight'), '')::INTEGER,
      pieces = NULLIF((load_data->>'pieces'), '')::INTEGER,
      total_amount = (load_data->>'total_amount')::NUMERIC,
      status = COALESCE(load_data->>'status', status),
      driver_user_id = (load_data->>'driver_user_id')::UUID,
      internal_dispatcher_user_id = NULLIF((load_data->>'internal_dispatcher_user_id'), '')::UUID,
      payment_period_id = NULLIF((load_data->>'payment_period_id'), '')::UUID,
      leasing_percentage = NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      factoring_percentage = NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      dispatching_percentage = NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      notes = NULLIF(load_data->>'notes', ''),
      updated_by = current_user_id,
      updated_at = now()
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
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$$;