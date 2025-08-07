-- ========================================
-- ACID Implementation for Load Operations
-- ========================================

-- Function to create or update a load with ACID guarantees
CREATE OR REPLACE FUNCTION public.create_or_update_load_with_validation(
  load_data JSONB,
  stops_data JSONB DEFAULT '[]'::jsonb,
  mode TEXT DEFAULT 'create'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_load RECORD;
  stop_record JSONB;
  target_period_id UUID;
  company_id_found UUID;
  final_result JSONB;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Start atomic transaction (implicit in function)
  
  -- ================================
  -- 1. VALIDATE AND CREATE/UPDATE LOAD
  -- ================================
  
  IF mode = 'edit' AND (load_data->>'id') IS NOT NULL THEN
    -- UPDATE MODE: Verify permissions and update
    IF NOT EXISTS (
      SELECT 1 FROM loads l
      JOIN user_company_roles ucr ON (
        l.created_by = ucr.user_id OR 
        ucr.role IN ('company_owner', 'operations_manager')
      )
      WHERE l.id = (load_data->>'id')::UUID
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'No tienes permisos para editar esta carga';
    END IF;

    -- Determine status based on data
    DECLARE
      updated_status TEXT;
    BEGIN
      IF (load_data->>'driver_user_id') IS NOT NULL AND trim(load_data->>'driver_user_id') != '' THEN
        updated_status := 'assigned';
      ELSIF jsonb_array_length(stops_data) >= 2 THEN
        updated_status := 'route_planned';
      ELSE
        updated_status := 'created';
      END IF;

      UPDATE loads SET
        load_number = load_data->>'load_number',
        po_number = NULLIF(load_data->>'po_number', ''),
        driver_user_id = NULLIF((load_data->>'driver_user_id'), '')::UUID,
        internal_dispatcher_id = NULLIF((load_data->>'internal_dispatcher_id'), '')::UUID,
        client_id = NULLIF((load_data->>'client_id'), '')::UUID,
        client_contact_id = NULLIF((load_data->>'client_contact_id'), '')::UUID,
        total_amount = (load_data->>'total_amount')::NUMERIC,
        commodity = NULLIF(load_data->>'commodity', ''),
        weight_lbs = NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
        notes = NULLIF(load_data->>'notes', ''),
        customer_name = NULLIF(load_data->>'customer_name', ''),
        factoring_percentage = NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
        dispatching_percentage = NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
        leasing_percentage = NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
        status = updated_status,
        updated_at = now()
      WHERE id = (load_data->>'id')::UUID
      RETURNING * INTO result_load;
    END;
  ELSE
    -- CREATE MODE: Check for duplicate load number
    IF EXISTS (SELECT 1 FROM loads WHERE load_number = load_data->>'load_number') THEN
      RAISE EXCEPTION 'El número de carga "%" ya existe. Use un número diferente.', load_data->>'load_number';
    END IF;

    -- Determine initial status
    DECLARE
      initial_status TEXT := 'created';
    BEGIN
      IF (load_data->>'driver_user_id') IS NOT NULL AND trim(load_data->>'driver_user_id') != '' THEN
        initial_status := 'assigned';
      ELSIF jsonb_array_length(stops_data) >= 2 THEN
        initial_status := 'route_planned';
      END IF;

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
        NULLIF((load_data->>'client_id'), '')::UUID,
        NULLIF((load_data->>'client_contact_id'), '')::UUID,
        (load_data->>'total_amount')::NUMERIC,
        NULLIF(load_data->>'commodity', ''),
        NULLIF((load_data->>'weight_lbs'), '')::INTEGER,
        NULLIF(load_data->>'notes', ''),
        NULLIF(load_data->>'customer_name', ''),
        NULLIF((load_data->>'factoring_percentage'), '')::NUMERIC,
        NULLIF((load_data->>'dispatching_percentage'), '')::NUMERIC,
        NULLIF((load_data->>'leasing_percentage'), '')::NUMERIC,
        initial_status,
        current_user_id
      ) RETURNING * INTO result_load;
    END;
  END IF;

  IF result_load IS NULL THEN
    RAISE EXCEPTION 'Error creando/actualizando la carga';
  END IF;

  -- ================================
  -- 2. HANDLE LOAD STOPS ATOMICALLY
  -- ================================
  
  IF jsonb_array_length(stops_data) > 0 THEN
    -- Delete existing stops if in edit mode
    IF mode = 'edit' THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;

    -- Insert new stops
    FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data)
    LOOP
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
        NULLIF(stop_record->>'scheduled_date', '')::DATE,
        NULLIF(stop_record->>'actual_date', '')::DATE
      );
    END LOOP;
  END IF;

  -- ================================
  -- 3. AUTO-ASSIGN PAYMENT PERIOD
  -- ================================
  
  -- Get company ID from user roles (for driver or creator)
  DECLARE
    target_user_id UUID := COALESCE(result_load.driver_user_id, result_load.created_by);
    target_date DATE;
  BEGIN
    SELECT company_id INTO company_id_found
    FROM user_company_roles
    WHERE user_id = target_user_id
    AND is_active = true
    LIMIT 1;

    IF company_id_found IS NOT NULL THEN
      -- Determine target date for period assignment
      SELECT COALESCE(
        (SELECT MIN(scheduled_date) FROM load_stops WHERE load_id = result_load.id AND stop_type = 'pickup'),
        (SELECT MIN(scheduled_date) FROM load_stops WHERE load_id = result_load.id AND stop_type = 'delivery'),
        CURRENT_DATE
      ) INTO target_date;

      -- Find appropriate payment period
      SELECT id INTO target_period_id
      FROM company_payment_periods
      WHERE company_id = company_id_found
      AND period_start_date <= target_date
      AND period_end_date >= target_date
      AND status IN ('open', 'processing')
      LIMIT 1;

      -- If no period found, try to generate one using existing function
      IF target_period_id IS NULL THEN
        PERFORM generate_company_payment_periods_with_calculations(
          company_id_found,
          target_date - INTERVAL '30 days',
          target_date + INTERVAL '30 days',
          true
        );

        -- Try again to find the period
        SELECT id INTO target_period_id
        FROM company_payment_periods
        WHERE company_id = company_id_found
        AND period_start_date <= target_date
        AND period_end_date >= target_date
        AND status IN ('open', 'processing')
        LIMIT 1;
      END IF;

      -- Update load with payment period
      IF target_period_id IS NOT NULL THEN
        UPDATE loads 
        SET payment_period_id = target_period_id
        WHERE id = result_load.id;
        
        result_load.payment_period_id := target_period_id;
      END IF;
    END IF;
  END;

  -- ================================
  -- 4. PREPARE FINAL RESULT
  -- ================================
  
  final_result := jsonb_build_object(
    'success', true,
    'load', row_to_json(result_load),
    'message', CASE 
      WHEN mode = 'edit' THEN 'Carga actualizada exitosamente con garantías ACID'
      ELSE 'Carga creada exitosamente con garantías ACID'
    END,
    'stops_processed', jsonb_array_length(stops_data),
    'payment_period_assigned', target_period_id IS NOT NULL,
    'payment_period_id', target_period_id
  );

  RETURN final_result;

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error en operación ACID de carga: %', SQLERRM;
END;
$$;

-- Function to delete a load with ACID guarantees
CREATE OR REPLACE FUNCTION public.delete_load_with_validation(
  load_id_param UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  load_record RECORD;
  current_user_id UUID;
  docs_deleted INTEGER := 0;
  stops_deleted INTEGER := 0;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get load information and verify permissions
  SELECT l.*, ucr.role INTO load_record
  FROM loads l
  LEFT JOIN user_company_roles ucr ON (
    ucr.user_id = current_user_id 
    AND ucr.is_active = true
  )
  WHERE l.id = load_id_param
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Verify permissions: creator, company owner, or operations manager
  IF NOT (
    load_record.created_by = current_user_id OR 
    load_record.role IN ('company_owner', 'operations_manager', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar esta carga';
  END IF;

  -- Verify load status allows deletion
  IF load_record.status IN ('completed', 'delivered') THEN
    RAISE EXCEPTION 'No se puede eliminar una carga completada o entregada';
  END IF;

  -- Start atomic deletion process
  
  -- 1. Delete load documents
  WITH deleted_docs AS (
    DELETE FROM load_documents 
    WHERE load_id = load_id_param 
    RETURNING id
  )
  SELECT COUNT(*) INTO docs_deleted FROM deleted_docs;

  -- 2. Delete load stops
  WITH deleted_stops AS (
    DELETE FROM load_stops 
    WHERE load_id = load_id_param 
    RETURNING id
  )
  SELECT COUNT(*) INTO stops_deleted FROM deleted_stops;

  -- 3. Finally delete the load
  DELETE FROM loads WHERE id = load_id_param;

  -- Return success information
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Carga eliminada exitosamente con garantías ACID',
    'load_number', load_record.load_number,
    'documents_deleted', docs_deleted,
    'stops_deleted', stops_deleted,
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error eliminando carga: %', SQLERRM;
END;
$$;