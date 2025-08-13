-- Create RPC function for fuel expense creation with validation
CREATE OR REPLACE FUNCTION public.create_or_update_fuel_expense_with_validation(
  expense_data jsonb,
  expense_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_driver_user_id UUID;
  target_payment_period_id UUID;
  target_company_id UUID;
  result_expense RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract data
  target_driver_user_id := (expense_data->>'driver_user_id')::UUID;
  target_payment_period_id := (expense_data->>'payment_period_id')::UUID;

  IF target_driver_user_id IS NULL THEN
    RAISE EXCEPTION 'driver_user_id es requerido';
  END IF;

  IF target_payment_period_id IS NULL THEN
    RAISE EXCEPTION 'payment_period_id es requerido';
  END IF;

  -- Get company from payment period
  SELECT cpp.company_id INTO target_company_id
  FROM company_payment_periods cpp
  WHERE cpp.id = target_payment_period_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Período de pago no encontrado';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN expense_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  -- User must be the driver OR an admin in the driver's company
  IF NOT (
    current_user_id = target_driver_user_id OR
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = current_user_id
      AND ucr1.is_active = true
      AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.user_id = target_driver_user_id
      AND ucr2.is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar gastos de combustible para este conductor';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(expense_data->>'transaction_date', '') IS NULL THEN
    RAISE EXCEPTION 'transaction_date es requerido';
  END IF;

  IF NULLIF((expense_data->>'gallons_purchased'), '')::NUMERIC IS NULL THEN
    RAISE EXCEPTION 'gallons_purchased es requerido';
  END IF;

  IF NULLIF((expense_data->>'total_amount'), '')::NUMERIC IS NULL THEN
    RAISE EXCEPTION 'total_amount es requerido';
  END IF;

  -- For UPDATE operations, validate expense exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM fuel_expenses fe
      WHERE fe.id = expense_id
      AND (
        fe.driver_user_id = current_user_id OR
        EXISTS (
          SELECT 1 FROM driver_period_calculations dpc
          JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
          JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
          WHERE dpc.id = fe.payment_period_id
          AND ucr.user_id = current_user_id
          AND ucr.is_active = true
          AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
        )
      )
    ) THEN
      RAISE EXCEPTION 'Gasto de combustible no encontrado o sin permisos para modificarlo';
    END IF;
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE EXPENSE
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO fuel_expenses (
      driver_user_id,
      payment_period_id,
      transaction_date,
      fuel_type,
      gallons_purchased,
      price_per_gallon,
      gross_amount,
      discount_amount,
      fees,
      total_amount,
      station_name,
      station_state,
      card_last_five,
      invoice_number,
      status,
      created_by,
      vehicle_id,
      notes
    ) VALUES (
      target_driver_user_id,
      target_payment_period_id,
      (expense_data->>'transaction_date')::DATE,
      COALESCE(expense_data->>'fuel_type', 'diesel'),
      (expense_data->>'gallons_purchased')::NUMERIC,
      NULLIF((expense_data->>'price_per_gallon'), '')::NUMERIC,
      NULLIF((expense_data->>'gross_amount'), '')::NUMERIC,
      COALESCE((expense_data->>'discount_amount')::NUMERIC, 0),
      COALESCE((expense_data->>'fees')::NUMERIC, 0),
      (expense_data->>'total_amount')::NUMERIC,
      NULLIF(expense_data->>'station_name', ''),
      NULLIF(expense_data->>'station_state', ''),
      NULLIF(expense_data->>'card_last_five', ''),
      NULLIF(expense_data->>'invoice_number', ''),
      COALESCE(expense_data->>'status', 'pending'),
      current_user_id,
      NULLIF((expense_data->>'vehicle_id'), '')::UUID,
      NULLIF(expense_data->>'notes', '')
    ) RETURNING * INTO result_expense;
  ELSE
    UPDATE fuel_expenses SET
      transaction_date = (expense_data->>'transaction_date')::DATE,
      fuel_type = COALESCE(expense_data->>'fuel_type', fuel_type),
      gallons_purchased = (expense_data->>'gallons_purchased')::NUMERIC,
      price_per_gallon = COALESCE(NULLIF((expense_data->>'price_per_gallon'), '')::NUMERIC, price_per_gallon),
      gross_amount = COALESCE(NULLIF((expense_data->>'gross_amount'), '')::NUMERIC, gross_amount),
      discount_amount = COALESCE((expense_data->>'discount_amount')::NUMERIC, discount_amount),
      fees = COALESCE((expense_data->>'fees')::NUMERIC, fees),
      total_amount = (expense_data->>'total_amount')::NUMERIC,
      station_name = COALESCE(NULLIF(expense_data->>'station_name', ''), station_name),
      station_state = COALESCE(NULLIF(expense_data->>'station_state', ''), station_state),
      card_last_five = COALESCE(NULLIF(expense_data->>'card_last_five', ''), card_last_five),
      invoice_number = COALESCE(NULLIF(expense_data->>'invoice_number', ''), invoice_number),
      status = COALESCE(expense_data->>'status', status),
      vehicle_id = COALESCE(NULLIF((expense_data->>'vehicle_id'), '')::UUID, vehicle_id),
      notes = COALESCE(NULLIF(expense_data->>'notes', ''), notes),
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
$$;