-- Corregir la función RPC para manejar fechas correctamente en UTC
CREATE OR REPLACE FUNCTION public.create_or_update_fuel_expense_with_validation(expense_data jsonb, expense_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_period_id UUID;
  target_company_id UUID;
  company_payment_period_id UUID;
  result_expense RECORD;
  operation_type TEXT;
  parsed_transaction_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract payment_period_id from expense_data (this is driver_period_calculation ID)
  target_period_id := (expense_data->>'payment_period_id')::UUID;
  IF target_period_id IS NULL THEN
    RAISE EXCEPTION 'payment_period_id es requerido';
  END IF;

  -- Get company_id and company_payment_period_id from the driver_period_calculation
  SELECT cpp.company_id, cpp.id INTO target_company_id, company_payment_period_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = target_period_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Payment period not found';
  END IF;

  -- Parse transaction_date correctly for UTC storage
  -- Si viene solo la fecha (YYYY-MM-DD), la convertimos a medianoche UTC
  -- Si ya viene con timezone, la usamos tal como está
  BEGIN
    IF (expense_data->>'transaction_date') ~ '^\d{4}-\d{2}-\d{2}$' THEN
      -- Solo fecha, convertir a medianoche UTC
      parsed_transaction_date := (expense_data->>'transaction_date')::DATE AT TIME ZONE 'UTC';
    ELSE
      -- Ya tiene timezone o es timestamp completo
      parsed_transaction_date := (expense_data->>'transaction_date')::TIMESTAMP WITH TIME ZONE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Formato de fecha inválido en transaction_date: %', expense_data->>'transaction_date';
  END;

  -- Determine operation type
  operation_type := CASE WHEN expense_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'driver', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar gastos de combustible en esta empresa';
  END IF;

  -- For UPDATE operations, validate expense exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM fuel_expenses fe
      JOIN company_payment_periods cpp ON fe.payment_period_id = cpp.id
      WHERE fe.id = expense_id
      AND cpp.company_id = target_company_id
    ) THEN
      RAISE EXCEPTION 'Gasto de combustible no encontrado o sin permisos para modificarlo';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(expense_data->>'driver_user_id', '') IS NULL THEN
    RAISE EXCEPTION 'driver_user_id es requerido';
  END IF;

  IF NULLIF(expense_data->>'transaction_date', '') IS NULL THEN
    RAISE EXCEPTION 'transaction_date es requerido';
  END IF;

  IF (expense_data->>'gallons_purchased')::NUMERIC <= 0 THEN
    RAISE EXCEPTION 'gallons_purchased debe ser mayor a 0';
  END IF;

  IF (expense_data->>'total_amount')::NUMERIC <= 0 THEN
    RAISE EXCEPTION 'total_amount debe ser mayor a 0';
  END IF;

  -- Validate driver belongs to company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (expense_data->>'driver_user_id')::UUID
    AND company_id = target_company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El conductor no pertenece a esta empresa';
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE FUEL EXPENSE
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO fuel_expenses (
      payment_period_id,
      driver_user_id,
      transaction_date,
      gallons_purchased,
      price_per_gallon,
      total_amount,
      station_name,
      station_state,
      fuel_type,
      vehicle_id,
      card_last_five,
      notes,
      fees,
      discount_amount,
      gross_amount,
      invoice_number,
      raw_webhook_data,
      created_by
    ) VALUES (
      company_payment_period_id, -- Use company_payment_period_id instead of target_period_id
      (expense_data->>'driver_user_id')::UUID,
      parsed_transaction_date, -- Use the properly parsed UTC date
      (expense_data->>'gallons_purchased')::NUMERIC,
      COALESCE((expense_data->>'price_per_gallon')::NUMERIC, (expense_data->>'total_amount')::NUMERIC / (expense_data->>'gallons_purchased')::NUMERIC),
      (expense_data->>'total_amount')::NUMERIC,
      NULLIF(expense_data->>'station_name', ''),
      NULLIF(expense_data->>'station_state', ''),
      COALESCE(expense_data->>'fuel_type', 'diesel'),
      NULLIF((expense_data->>'vehicle_id'), '')::UUID,
      NULLIF(expense_data->>'card_last_five', ''),
      NULLIF(expense_data->>'notes', ''),
      COALESCE((expense_data->>'fees')::NUMERIC, 0),
      COALESCE((expense_data->>'discount_amount')::NUMERIC, 0),
      NULLIF((expense_data->>'gross_amount'), '')::NUMERIC,
      NULLIF(expense_data->>'invoice_number', ''),
      NULLIF(expense_data->>'raw_webhook_data', '')::JSONB,
      current_user_id
    ) RETURNING * INTO result_expense;
  ELSE
    UPDATE fuel_expenses SET
      driver_user_id = (expense_data->>'driver_user_id')::UUID,
      transaction_date = parsed_transaction_date, -- Use the properly parsed UTC date
      gallons_purchased = (expense_data->>'gallons_purchased')::NUMERIC,
      price_per_gallon = COALESCE((expense_data->>'price_per_gallon')::NUMERIC, (expense_data->>'total_amount')::NUMERIC / (expense_data->>'gallons_purchased')::NUMERIC),
      total_amount = (expense_data->>'total_amount')::NUMERIC,
      station_name = NULLIF(expense_data->>'station_name', ''),
      station_state = NULLIF(expense_data->>'station_state', ''),
      fuel_type = COALESCE(expense_data->>'fuel_type', fuel_type),
      vehicle_id = NULLIF((expense_data->>'vehicle_id'), '')::UUID,
      card_last_five = NULLIF(expense_data->>'card_last_five', ''),
      notes = NULLIF(expense_data->>'notes', ''),
      fees = COALESCE((expense_data->>'fees')::NUMERIC, fees),
      discount_amount = COALESCE((expense_data->>'discount_amount')::NUMERIC, discount_amount),
      gross_amount = NULLIF((expense_data->>'gross_amount'), '')::NUMERIC,
      invoice_number = NULLIF(expense_data->>'invoice_number', ''),
      raw_webhook_data = NULLIF(expense_data->>'raw_webhook_data', '')::JSONB,
      updated_at = now()
    WHERE id = expense_id
    RETURNING * INTO result_expense;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Gasto de combustible creado exitosamente'
      ELSE 'Gasto de combustible actualizado exitosamente'
    END,
    'expense', row_to_json(result_expense),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de gasto de combustible: %', SQLERRM;
END;
$function$;