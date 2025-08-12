-- Drop the problematic function completely and recreate a simple version
DROP FUNCTION IF EXISTS public.create_or_update_load_with_validation(jsonb, jsonb, text);

-- Create a simple, non-recursive load creation/update function
CREATE OR REPLACE FUNCTION public.create_or_update_load_with_validation(
  load_data jsonb, 
  stops_data jsonb, 
  mode text DEFAULT 'create'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  result_load RECORD;
  stop_record jsonb;
  existing_load_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get load ID for edit mode
  existing_load_id := (load_data->>'id')::UUID;

  -- Basic permission check - user must have an active company role
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar cargas';
  END IF;

  -- Validate required fields
  IF NULLIF(load_data->>'load_number', '') IS NULL THEN
    RAISE EXCEPTION 'load_number es requerido';
  END IF;

  IF NULLIF(load_data->>'client_id', '') IS NULL THEN
    RAISE EXCEPTION 'client_id es requerido';
  END IF;

  -- Create or update load
  IF mode = 'create' THEN
    INSERT INTO loads (
      load_number,
      po_number,
      driver_user_id,
      internal_dispatcher_id,
      client_id,
      client_contact_id,
      total_amount,
      commodity,
      weight_lbs,
      notes,
      customer_name,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      status,
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF((load_data->>'driver_user_id'), '')::UUID,
      NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      (load_data->>'client_id')::UUID,
      NULLIF((load_data->>'client_contact_id'), '')::UUID,
      COALESCE((load_data->>'total_amount')::NUMERIC, 0),
      NULLIF(load_data->>'commodity', ''),
      NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      NULLIF(load_data->>'notes', ''),
      NULLIF(load_data->>'customer_name', ''),
      NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      'created',
      current_user_id
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      driver_user_id = NULLIF((load_data->>'driver_user_id'), '')::UUID,
      internal_dispatcher_id = NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
      client_id = (load_data->>'client_id')::UUID,
      client_contact_id = NULLIF((load_data->>'client_contact_id'), '')::UUID,
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, 0),
      commodity = NULLIF(load_data->>'commodity', ''),
      weight_lbs = NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
      notes = NULLIF(load_data->>'notes', ''),
      customer_name = NULLIF(load_data->>'customer_name', ''),
      factoring_percentage = NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
      dispatching_percentage = NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
      leasing_percentage = NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
      updated_at = now()
    WHERE id = existing_load_id
    RETURNING * INTO result_load;
  END IF;

  -- Handle stops: delete existing ones for edit mode and insert new ones
  IF mode = 'edit' THEN
    DELETE FROM load_stops WHERE load_id = result_load.id;
  END IF;

  -- Insert new stops
  FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data) LOOP
    INSERT INTO load_stops (
      load_id,
      stop_number,
      stop_type,
      company_name,
      address,
      city,
      state,
      zip_code,
      reference_number,
      contact_name,
      contact_phone,
      special_instructions,
      scheduled_date,
      actual_date
    ) VALUES (
      result_load.id,
      (stop_record->>'stop_number')::INTEGER,
      stop_record->>'stop_type',
      stop_record->>'company_name',
      stop_record->>'address',
      stop_record->>'city',
      stop_record->>'state',
      stop_record->>'zip_code',
      NULLIF(stop_record->>'reference_number', ''),
      NULLIF(stop_record->>'contact_name', ''),
      NULLIF(stop_record->>'contact_phone', ''),
      NULLIF(stop_record->>'special_instructions', ''),
      NULLIF((stop_record->>'scheduled_date'), '')::DATE,
      NULLIF((stop_record->>'actual_date'), '')::DATE
    );
  END LOOP;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'operation', mode,
    'message', CASE 
      WHEN mode = 'create' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'load_id', result_load.id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de carga: %', SQLERRM;
END;
$$;