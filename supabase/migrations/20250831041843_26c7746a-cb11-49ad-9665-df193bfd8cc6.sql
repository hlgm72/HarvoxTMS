-- Corregir la función simple_load_operation para usar company_payment_periods

CREATE OR REPLACE FUNCTION public.simple_load_operation(operation_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  load_id UUID;
  operation_type TEXT;
  company_criteria TEXT;
  target_date DATE;
  matching_period_id UUID;
  result_load RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract operation type and company_id
  operation_type := operation_data->>'operation_type';
  target_company_id := (operation_data->>'company_id')::UUID;
  load_id := NULLIF(operation_data->>'load_id', '')::UUID;
  
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COMPANY_ID_REQUIRED';
  END IF;

  -- Validate permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_LOADS';
  END IF;

  -- Obtener criterio de asignación de la empresa
  SELECT load_assignment_criteria INTO company_criteria
  FROM companies 
  WHERE id = target_company_id;
  
  -- Si no hay criterio definido, usar delivery_date por defecto
  IF company_criteria IS NULL THEN
    company_criteria := 'delivery_date';
  END IF;

  -- Determinar fecha objetivo según criterio de empresa
  CASE company_criteria
    WHEN 'pickup_date' THEN
      target_date := NULLIF(operation_data->>'pickup_date', '')::DATE;
    WHEN 'assigned_date' THEN
      target_date := CURRENT_DATE;
    ELSE -- 'delivery_date' por defecto
      target_date := NULLIF(operation_data->>'delivery_date', '')::DATE;
  END CASE;

  -- Buscar período de pago apropiado usando company_payment_periods (CORREGIDO)
  IF target_date IS NOT NULL THEN
    SELECT id INTO matching_period_id
    FROM company_payment_periods  -- CAMBIO: era payment_periods
    WHERE company_id = target_company_id
      AND period_start_date <= target_date
      AND period_end_date >= target_date
      AND status IN ('open', 'processing')
    ORDER BY period_start_date DESC
    LIMIT 1;
  END IF;

  -- CREATE or UPDATE load
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      company_id,
      client_id,
      driver_user_id,
      load_number,
      pickup_date,
      delivery_date,
      pickup_address,
      delivery_address,
      pickup_city,
      pickup_state,
      pickup_zip,
      delivery_city,
      delivery_state,
      delivery_zip,
      pickup_contact_name,
      pickup_contact_phone,
      delivery_contact_name,
      delivery_contact_phone,
      commodity,
      weight,
      pieces,
      rate,
      fuel_surcharge,
      accessorial_charges,
      total_amount,
      miles,
      status,
      dispatcher_notes,
      driver_notes,
      special_instructions,
      equipment_type,
      temperature_controlled,
      hazmat,
      rush_delivery,
      payment_period_id,
      created_by,
      updated_by
    ) VALUES (
      target_company_id,
      NULLIF(operation_data->>'client_id', '')::UUID,
      NULLIF(operation_data->>'driver_user_id', '')::UUID,
      operation_data->>'load_number',
      NULLIF(operation_data->>'pickup_date', '')::DATE,
      NULLIF(operation_data->>'delivery_date', '')::DATE,
      NULLIF(operation_data->>'pickup_address', ''),
      NULLIF(operation_data->>'delivery_address', ''),
      NULLIF(operation_data->>'pickup_city', ''),
      NULLIF(operation_data->>'pickup_state', ''),
      NULLIF(operation_data->>'pickup_zip', ''),
      NULLIF(operation_data->>'delivery_city', ''),
      NULLIF(operation_data->>'delivery_state', ''),
      NULLIF(operation_data->>'delivery_zip', ''),
      NULLIF(operation_data->>'pickup_contact_name', ''),
      NULLIF(operation_data->>'pickup_contact_phone', ''),
      NULLIF(operation_data->>'delivery_contact_name', ''),
      NULLIF(operation_data->>'delivery_contact_phone', ''),
      NULLIF(operation_data->>'commodity', ''),
      NULLIF((operation_data->>'weight'), '')::NUMERIC,
      NULLIF((operation_data->>'pieces'), '')::INTEGER,
      NULLIF((operation_data->>'rate'), '')::NUMERIC,
      NULLIF((operation_data->>'fuel_surcharge'), '')::NUMERIC,
      NULLIF((operation_data->>'accessorial_charges'), '')::NUMERIC,
      NULLIF((operation_data->>'total_amount'), '')::NUMERIC,
      NULLIF((operation_data->>'miles'), '')::NUMERIC,
      COALESCE(operation_data->>'status', 'draft'),
      NULLIF(operation_data->>'dispatcher_notes', ''),
      NULLIF(operation_data->>'driver_notes', ''),
      NULLIF(operation_data->>'special_instructions', ''),
      NULLIF(operation_data->>'equipment_type', ''),
      COALESCE((operation_data->>'temperature_controlled')::BOOLEAN, false),
      COALESCE((operation_data->>'hazmat')::BOOLEAN, false),
      COALESCE((operation_data->>'rush_delivery')::BOOLEAN, false),
      matching_period_id,
      current_user_id,
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    -- UPDATE operation
    UPDATE loads SET
      client_id = NULLIF(operation_data->>'client_id', '')::UUID,
      driver_user_id = NULLIF(operation_data->>'driver_user_id', '')::UUID,
      load_number = operation_data->>'load_number',
      pickup_date = NULLIF(operation_data->>'pickup_date', '')::DATE,
      delivery_date = NULLIF(operation_data->>'delivery_date', '')::DATE,
      pickup_address = NULLIF(operation_data->>'pickup_address', ''),
      delivery_address = NULLIF(operation_data->>'delivery_address', ''),
      pickup_city = NULLIF(operation_data->>'pickup_city', ''),
      pickup_state = NULLIF(operation_data->>'pickup_state', ''),
      pickup_zip = NULLIF(operation_data->>'pickup_zip', ''),
      delivery_city = NULLIF(operation_data->>'delivery_city', ''),
      delivery_state = NULLIF(operation_data->>'delivery_state', ''),
      delivery_zip = NULLIF(operation_data->>'delivery_zip', ''),
      pickup_contact_name = NULLIF(operation_data->>'pickup_contact_name', ''),
      pickup_contact_phone = NULLIF(operation_data->>'pickup_contact_phone', ''),
      delivery_contact_name = NULLIF(operation_data->>'delivery_contact_name', ''),
      delivery_contact_phone = NULLIF(operation_data->>'delivery_contact_phone', ''),
      commodity = NULLIF(operation_data->>'commodity', ''),
      weight = NULLIF((operation_data->>'weight'), '')::NUMERIC,
      pieces = NULLIF((operation_data->>'pieces'), '')::INTEGER,
      rate = NULLIF((operation_data->>'rate'), '')::NUMERIC,
      fuel_surcharge = NULLIF((operation_data->>'fuel_surcharge'), '')::NUMERIC,
      accessorial_charges = NULLIF((operation_data->>'accessorial_charges'), '')::NUMERIC,
      total_amount = NULLIF((operation_data->>'total_amount'), '')::NUMERIC,
      miles = NULLIF((operation_data->>'miles'), '')::NUMERIC,
      dispatcher_notes = NULLIF(operation_data->>'dispatcher_notes', ''),
      driver_notes = NULLIF(operation_data->>'driver_notes', ''),
      special_instructions = NULLIF(operation_data->>'special_instructions', ''),
      equipment_type = NULLIF(operation_data->>'equipment_type', ''),
      temperature_controlled = COALESCE((operation_data->>'temperature_controlled')::BOOLEAN, temperature_controlled),
      hazmat = COALESCE((operation_data->>'hazmat')::BOOLEAN, hazmat),
      rush_delivery = COALESCE((operation_data->>'rush_delivery')::BOOLEAN, rush_delivery),
      payment_period_id = COALESCE(matching_period_id, payment_period_id),
      updated_by = current_user_id,
      updated_at = now()
    WHERE id = load_id
    RETURNING * INTO result_load;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_assigned', matching_period_id,
    'assignment_criteria', company_criteria,
    'target_date', target_date,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$function$;