-- 🚨 CORRECCIÓN: Eliminar creación automática de cálculos vacíos para todos los conductores
-- Solo crear cálculos cuando haya datos reales (cargas, combustible, etc.)

-- 1. BUSCAR Y ELIMINAR EL TRIGGER QUE CREA AUTOMÁTICAMENTE CÁLCULOS VACÍOS
DROP TRIGGER IF EXISTS auto_create_driver_calculations_trigger ON company_payment_periods;

-- 2. MODIFICAR LA FUNCIÓN PARA QUE NO CREE CÁLCULOS AUTOMÁTICOS VACÍOS
CREATE OR REPLACE FUNCTION public.auto_create_driver_calculations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- 🚨 FUNCIÓN DESHABILITADA: Ya no crear automáticamente cálculos vacíos
  -- Los cálculos se crearán on-demand cuando haya transacciones reales
  -- Ver: docs/CRITICAL-PAYMENT-PERIODS-PREVENTION.md
  
  RAISE LOG 'auto_create_driver_calculations: DESHABILITADA - Sistema on-demand activo para período %', NEW.id;
  
  RETURN NEW;
END;
$function$;

-- 3. CREAR FUNCIÓN PARA CREAR CÁLCULO SOLO CUANDO SEA NECESARIO
CREATE OR REPLACE FUNCTION public.ensure_driver_period_calculation_exists(
  target_period_id UUID,
  target_driver_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  existing_calculation_id UUID;
  new_calculation_id UUID;
BEGIN
  -- Buscar cálculo existente
  SELECT id INTO existing_calculation_id
  FROM driver_period_calculations
  WHERE company_payment_period_id = target_period_id
    AND driver_user_id = target_driver_user_id;
    
  IF existing_calculation_id IS NOT NULL THEN
    RETURN existing_calculation_id;
  END IF;
  
  -- Crear nuevo cálculo solo cuando se necesite
  INSERT INTO driver_period_calculations (
    company_payment_period_id,
    driver_user_id,
    gross_earnings,
    fuel_expenses,
    total_deductions,
    other_income,
    total_income,
    net_payment,
    has_negative_balance,
    payment_status
  ) VALUES (
    target_period_id,
    target_driver_user_id,
    0, 0, 0, 0, 0, 0, false,
    'calculated'
  ) RETURNING id INTO new_calculation_id;
  
  RAISE LOG 'ensure_driver_period_calculation_exists: Created calculation % for driver % in period %', 
    new_calculation_id, target_driver_user_id, target_period_id;
    
  RETURN new_calculation_id;
END;
$function$;

-- 4. ACTUALIZAR simple_load_operation PARA USAR EL NUEVO SISTEMA
CREATE OR REPLACE FUNCTION public.simple_load_operation(operation_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  load_id UUID;
  operation_type TEXT;
  company_criteria TEXT;
  target_date DATE;
  matching_period_id UUID;
  driver_calculation_id UUID;
  result_load RECORD;
  stops_data JSONB;
  stop_record JSONB;
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

  -- ✅ USAR SISTEMA ON-DEMAND PARA PERÍODO
  IF target_date IS NOT NULL THEN
    matching_period_id := create_payment_period_if_needed(target_company_id, target_date, current_user_id);
    
    RAISE NOTICE '✅ Sistema on-demand: período % para fecha % en empresa %', 
      matching_period_id, target_date, target_company_id;
  END IF;

  -- CREATE or UPDATE load
  IF operation_type = 'CREATE' THEN
    INSERT INTO loads (
      company_id, client_id, driver_user_id, load_number, pickup_date, delivery_date,
      pickup_address, delivery_address, pickup_city, pickup_state, pickup_zip,
      delivery_city, delivery_state, delivery_zip, pickup_contact_name, pickup_contact_phone,
      delivery_contact_name, delivery_contact_phone, commodity, weight, pieces,
      rate, fuel_surcharge, accessorial_charges, total_amount, miles, status,
      dispatcher_notes, driver_notes, special_instructions, equipment_type,
      temperature_controlled, hazmat, rush_delivery, payment_period_id,
      created_by, updated_by
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
    UPDATE loads SET
      client_id = NULLIF(operation_data->>'client_id', '')::UUID,
      driver_user_id = COALESCE(NULLIF(operation_data->>'driver_user_id', '')::UUID, driver_user_id),
      load_number = COALESCE(operation_data->>'load_number', load_number),
      pickup_date = COALESCE(NULLIF(operation_data->>'pickup_date', '')::DATE, pickup_date),
      delivery_date = COALESCE(NULLIF(operation_data->>'delivery_date', '')::DATE, delivery_date),
      pickup_address = COALESCE(NULLIF(operation_data->>'pickup_address', ''), pickup_address),
      delivery_address = COALESCE(NULLIF(operation_data->>'delivery_address', ''), delivery_address),
      pickup_city = COALESCE(NULLIF(operation_data->>'pickup_city', ''), pickup_city),
      pickup_state = COALESCE(NULLIF(operation_data->>'pickup_state', ''), pickup_state),
      pickup_zip = COALESCE(NULLIF(operation_data->>'pickup_zip', ''), pickup_zip),
      delivery_city = COALESCE(NULLIF(operation_data->>'delivery_city', ''), delivery_city),
      delivery_state = COALESCE(NULLIF(operation_data->>'delivery_state', ''), delivery_state),
      delivery_zip = COALESCE(NULLIF(operation_data->>'delivery_zip', ''), delivery_zip),
      pickup_contact_name = COALESCE(NULLIF(operation_data->>'pickup_contact_name', ''), pickup_contact_name),
      pickup_contact_phone = COALESCE(NULLIF(operation_data->>'pickup_contact_phone', ''), pickup_contact_phone),
      delivery_contact_name = COALESCE(NULLIF(operation_data->>'delivery_contact_name', ''), delivery_contact_name),
      delivery_contact_phone = COALESCE(NULLIF(operation_data->>'delivery_contact_phone', ''), delivery_contact_phone),
      commodity = COALESCE(NULLIF(operation_data->>'commodity', ''), commodity),
      weight = COALESCE(NULLIF((operation_data->>'weight'), '')::NUMERIC, weight),
      pieces = COALESCE(NULLIF((operation_data->>'pieces'), '')::INTEGER, pieces),
      rate = COALESCE(NULLIF((operation_data->>'rate'), '')::NUMERIC, rate),
      fuel_surcharge = COALESCE(NULLIF((operation_data->>'fuel_surcharge'), '')::NUMERIC, fuel_surcharge),
      accessorial_charges = COALESCE(NULLIF((operation_data->>'accessorial_charges'), '')::NUMERIC, accessorial_charges),
      total_amount = COALESCE(NULLIF((operation_data->>'total_amount'), '')::NUMERIC, total_amount),
      miles = COALESCE(NULLIF((operation_data->>'miles'), '')::NUMERIC, miles),
      status = COALESCE(operation_data->>'status', status),
      dispatcher_notes = COALESCE(NULLIF(operation_data->>'dispatcher_notes', ''), dispatcher_notes),
      driver_notes = COALESCE(NULLIF(operation_data->>'driver_notes', ''), driver_notes),
      special_instructions = COALESCE(NULLIF(operation_data->>'special_instructions', ''), special_instructions),
      equipment_type = COALESCE(NULLIF(operation_data->>'equipment_type', ''), equipment_type),
      temperature_controlled = COALESCE((operation_data->>'temperature_controlled')::BOOLEAN, temperature_controlled),
      hazmat = COALESCE((operation_data->>'hazmat')::BOOLEAN, hazmat),
      rush_delivery = COALESCE((operation_data->>'rush_delivery')::BOOLEAN, rush_delivery),
      payment_period_id = COALESCE(matching_period_id, payment_period_id),
      updated_by = current_user_id,
      updated_at = now()
    WHERE id = load_id
    RETURNING * INTO result_load;
  END IF;

  -- ✅ CREAR CÁLCULO DEL CONDUCTOR SOLO SI TIENE DATOS Y HAY CONDUCTOR ASIGNADO
  IF result_load.driver_user_id IS NOT NULL AND matching_period_id IS NOT NULL THEN
    driver_calculation_id := ensure_driver_period_calculation_exists(matching_period_id, result_load.driver_user_id);
    
    RAISE NOTICE '✅ Driver calculation ensured: % for driver % in period %', 
      driver_calculation_id, result_load.driver_user_id, matching_period_id;
  END IF;

  -- Procesar stops_data
  stops_data := operation_data->'stops_data';
  IF stops_data IS NOT NULL AND jsonb_array_length(stops_data) > 0 THEN
    IF operation_type = 'UPDATE' THEN
      DELETE FROM load_stops WHERE load_id = result_load.id;
    END IF;
    
    FOR stop_record IN SELECT * FROM jsonb_array_elements(stops_data) LOOP
      INSERT INTO load_stops (
        load_id, stop_number, location_type, address, city, state,
        zip_code, contact_name, contact_phone, scheduled_date, scheduled_time, notes
      ) VALUES (
        result_load.id,
        (stop_record->>'stop_number')::INTEGER,
        stop_record->>'location_type',
        stop_record->>'address',
        stop_record->>'city',
        stop_record->>'state',
        stop_record->>'zip_code',
        stop_record->>'contact_name',
        stop_record->>'contact_phone',
        NULLIF(stop_record->>'scheduled_date', '')::DATE,
        NULLIF(stop_record->>'scheduled_time', '')::TIME,
        stop_record->>'notes'
      );
    END LOOP;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_id', matching_period_id,
    'driver_calculation_id', driver_calculation_id,
    'stops_processed', CASE WHEN stops_data IS NOT NULL THEN jsonb_array_length(stops_data) ELSE 0 END,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Carga creada exitosamente'
      ELSE 'Carga actualizada exitosamente'
    END,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;