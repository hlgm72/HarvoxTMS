-- Corregir simple_load_operation_with_deductions para asignar created_by

CREATE OR REPLACE FUNCTION simple_load_operation_with_deductions(
  load_id_param UUID,
  load_data jsonb,
  stops_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_load_id UUID;
  v_payment_period_id UUID;
  v_old_payment_period_id UUID;
  v_driver_user_id UUID;
  v_company_id UUID;
  v_pickup_date DATE;
  v_delivery_date DATE;
  v_is_update BOOLEAN;
  v_stop jsonb;
BEGIN
  -- Determinar si es actualización o creación
  v_is_update := (load_id_param IS NOT NULL);
  
  -- Extraer datos necesarios del JSON
  v_driver_user_id := NULLIF((load_data->>'driver_user_id')::text, '')::UUID;
  v_pickup_date := NULLIF(load_data->>'pickup_date', '')::DATE;
  v_delivery_date := NULLIF(load_data->>'delivery_date', '')::DATE;
  
  -- Obtener company_id desde user_company_roles
  SELECT ucr.company_id INTO v_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;

  -- Si es actualización, guardar el período viejo
  IF v_is_update THEN
    SELECT payment_period_id INTO v_old_payment_period_id
    FROM loads
    WHERE id = load_id_param;
  END IF;

  -- ========================================
  -- 1. CREAR/ACTUALIZAR EL LOAD
  -- ========================================
  IF v_is_update THEN
    -- UPDATE: Actualizar carga existente
    UPDATE loads SET
      load_number = load_data->>'load_number',
      po_number = NULLIF(load_data->>'po_number', ''),
      driver_user_id = v_driver_user_id,
      internal_dispatcher_id = NULLIF((load_data->>'internal_dispatcher_id')::text, '')::UUID,
      client_id = NULLIF((load_data->>'client_id')::text, '')::UUID,
      client_contact_id = NULLIF((load_data->>'client_contact_id')::text, '')::UUID,
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, 0),
      commodity = NULLIF(load_data->>'commodity', ''),
      weight_lbs = NULLIF((load_data->>'weight_lbs')::text, '')::NUMERIC,
      notes = NULLIF(load_data->>'notes', ''),
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      pickup_date = v_pickup_date,
      delivery_date = v_delivery_date,
      updated_at = NOW()
    WHERE id = load_id_param
    RETURNING id INTO v_load_id;

    IF v_load_id IS NULL THEN
      RAISE EXCEPTION 'La carga con ID % no existe', load_id_param;
    END IF;

  ELSE
    -- CREATE: Insertar nueva carga (AGREGANDO created_by)
    INSERT INTO loads (
      load_number, po_number, driver_user_id, internal_dispatcher_id,
      client_id, client_contact_id, total_amount, commodity, weight_lbs,
      notes, pickup_date, delivery_date,
      factoring_percentage, dispatching_percentage, leasing_percentage,
      created_by
    ) VALUES (
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      v_driver_user_id,
      NULLIF((load_data->>'internal_dispatcher_id')::text, '')::UUID,
      NULLIF((load_data->>'client_id')::text, '')::UUID,
      NULLIF((load_data->>'client_contact_id')::text, '')::UUID,
      COALESCE((load_data->>'total_amount')::NUMERIC, 0),
      NULLIF(load_data->>'commodity', ''),
      NULLIF((load_data->>'weight_lbs')::text, '')::NUMERIC,
      NULLIF(load_data->>'notes', ''),
      v_pickup_date,
      v_delivery_date,
      COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0),
      COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0),
      auth.uid()  -- CRÍTICO: Asignar created_by para RLS
    )
    RETURNING id INTO v_load_id;
  END IF;

  -- ========================================
  -- 2. GESTIONAR STOPS
  -- ========================================
  IF v_is_update THEN
    DELETE FROM load_stops WHERE load_id = v_load_id;
  END IF;

  FOR v_stop IN SELECT * FROM jsonb_array_elements(stops_data)
  LOOP
    INSERT INTO load_stops (
      load_id, stop_number, stop_type, facility_id,
      special_instructions, driver_notes, scheduled_date, scheduled_time,
      actual_date, actual_time, pickup_timezone, delivery_timezone
    ) VALUES (
      v_load_id,
      (v_stop->>'stop_number')::INTEGER,
      v_stop->>'stop_type',
      NULLIF((v_stop->>'facility_id')::text, '')::UUID,
      NULLIF(v_stop->>'special_instructions', ''),
      NULLIF(v_stop->>'driver_notes', ''),
      NULLIF(v_stop->>'scheduled_date', '')::DATE,
      NULLIF(v_stop->>'scheduled_time', '')::TIME,
      NULLIF(v_stop->>'actual_date', '')::DATE,
      NULLIF(v_stop->>'actual_time', '')::TIME,
      COALESCE(v_stop->>'pickup_timezone', 'America/New_York'),
      COALESCE(v_stop->>'delivery_timezone', 'America/New_York')
    );
  END LOOP;

  -- ========================================
  -- 3. ASIGNAR PAYMENT PERIOD (Simplificado)
  -- ========================================
  IF v_driver_user_id IS NOT NULL AND v_delivery_date IS NOT NULL THEN
    -- Buscar período existente
    SELECT id INTO v_payment_period_id
    FROM company_payment_periods
    WHERE company_id = v_company_id
      AND period_start_date <= v_delivery_date
      AND period_end_date >= v_delivery_date
    LIMIT 1;

    -- Si se encontró período, asignarlo a la carga
    IF v_payment_period_id IS NOT NULL THEN
      UPDATE loads
      SET payment_period_id = v_payment_period_id
      WHERE id = v_load_id;
    END IF;
  END IF;

  -- ========================================
  -- 4. RETORNAR RESULTADO
  -- ========================================
  RETURN jsonb_build_object(
    'success', true,
    'load_id', v_load_id,
    'payment_period_id', v_payment_period_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en operación de carga: %', SQLERRM;
END;
$$;

-- Corregir la carga 25-009 que ya existe sin created_by
UPDATE loads 
SET created_by = driver_user_id
WHERE load_number = '25-009' AND created_by IS NULL;