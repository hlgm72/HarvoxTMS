-- Modificar la función existente para incluir cálculo automático de descuentos
CREATE OR REPLACE FUNCTION public.create_or_update_load_with_validation(load_data jsonb, stops_data jsonb DEFAULT '[]'::jsonb, mode text DEFAULT 'create'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_load RECORD;
  stop_record JSONB;
  target_period_id UUID;
  company_id_found UUID;
  final_result JSONB;
  current_user_id UUID;
  calculation_id UUID;
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

    -- Insert all stops
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
        NULLIF((stop_record->>'city'), '')::UUID,
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
  END IF;

  -- ================================
  -- 3. AUTO-ASSIGN TO PAYMENT PERIOD
  -- ================================
  
  IF result_load.driver_user_id IS NOT NULL THEN
    -- Get the company ID from the driver
    SELECT ucr.company_id INTO company_id_found
    FROM user_company_roles ucr
    WHERE ucr.user_id = result_load.driver_user_id
    AND ucr.is_active = true
    LIMIT 1;

    IF company_id_found IS NOT NULL THEN
      -- Get current open payment period
      SELECT id INTO target_period_id
      FROM company_payment_periods
      WHERE company_id = company_id_found
      AND status = 'open'
      ORDER BY period_start_date DESC
      LIMIT 1;

      -- If no open period exists, create one
      IF target_period_id IS NULL THEN
        -- Get company payment frequency for auto-generation
        DECLARE
          payment_frequency TEXT;
        BEGIN
          SELECT default_payment_frequency INTO payment_frequency
          FROM companies
          WHERE id = company_id_found;

          IF payment_frequency IS NOT NULL THEN
            -- Calculate period dates based on frequency
            DECLARE
              period_start DATE;
              period_end DATE;
            BEGIN
              CASE payment_frequency
                WHEN 'weekly' THEN
                  period_start := DATE_TRUNC('week', CURRENT_DATE);
                  period_end := period_start + INTERVAL '6 days';
                WHEN 'biweekly' THEN
                  period_start := DATE_TRUNC('week', CURRENT_DATE);
                  period_end := period_start + INTERVAL '13 days';
                WHEN 'monthly' THEN
                  period_start := DATE_TRUNC('month', CURRENT_DATE);
                  period_end := (period_start + INTERVAL '1 month' - INTERVAL '1 day');
                ELSE
                  period_start := DATE_TRUNC('week', CURRENT_DATE);
                  period_end := period_start + INTERVAL '6 days';
              END CASE;

              INSERT INTO company_payment_periods (
                company_id,
                period_start_date,
                period_end_date,
                period_frequency,
                status
              ) VALUES (
                company_id_found,
                period_start,
                period_end,
                payment_frequency,
                'open'
              ) RETURNING id INTO target_period_id;
            END;
          END IF;
        END;
      END IF;

      -- Assign load to payment period
      IF target_period_id IS NOT NULL THEN
        UPDATE loads
        SET payment_period_id = target_period_id
        WHERE id = result_load.id;
        
        -- ================================
        -- 4. AUTO-CALCULATE DEDUCTIONS
        -- ================================
        
        -- Find or create driver period calculation
        SELECT id INTO calculation_id
        FROM driver_period_calculations
        WHERE driver_user_id = result_load.driver_user_id
        AND company_payment_period_id = target_period_id;
        
        IF calculation_id IS NULL THEN
          -- Create driver period calculation if it doesn't exist
          INSERT INTO driver_period_calculations (
            company_payment_period_id,
            driver_user_id,
            gross_earnings,
            total_deductions,
            fuel_expenses,
            other_income,
            total_income,
            net_payment,
            has_negative_balance,
            payment_status,
            calculated_by,
            calculated_at
          ) VALUES (
            target_period_id,
            result_load.driver_user_id,
            0, 0, 0, 0, 0, 0, false,
            'calculated',
            current_user_id,
            now()
          ) RETURNING id INTO calculation_id;
        END IF;
        
        -- Calculate percentage deductions automatically
        IF calculation_id IS NOT NULL THEN
          PERFORM generate_load_percentage_deductions(result_load.id, calculation_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- Return success result
  final_result := jsonb_build_object(
    'success', true,
    'operation', mode,
    'message', CASE 
      WHEN mode = 'create' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'load', row_to_json(result_load),
    'stops_created', jsonb_array_length(stops_data),
    'assigned_to_period', target_period_id IS NOT NULL,
    'deductions_calculated', calculation_id IS NOT NULL,
    'processed_by', current_user_id,
    'processed_at', now()
  );

  RETURN final_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de carga: %', SQLERRM;
END;
$function$;