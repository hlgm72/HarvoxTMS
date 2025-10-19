-- Actualizar funciones de fuel expenses para recalcular correctamente cuando se elimina o cambia conductor

-- 1. Función de eliminación actualizada para usar user_payrolls
CREATE OR REPLACE FUNCTION public.delete_fuel_expense_with_validation(
  expense_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment_period_id UUID;
  v_driver_user_id UUID;
  v_company_id UUID;
  v_user_payroll_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Load expense details
  SELECT payment_period_id, driver_user_id 
  INTO v_payment_period_id, v_driver_user_id 
  FROM fuel_expenses 
  WHERE id = expense_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Gasto de combustible no encontrado'
    );
  END IF;

  -- Get company from payment period
  SELECT company_id 
  INTO v_company_id
  FROM company_payment_periods
  WHERE id = v_payment_period_id;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Período de pago no encontrado'
    );
  END IF;

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = v_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'No tienes permisos para eliminar este gasto'
    );
  END IF;

  -- Get the user_payroll for recalculation
  SELECT id INTO v_user_payroll_id
  FROM user_payrolls
  WHERE user_id = v_driver_user_id
    AND company_payment_period_id = v_payment_period_id
  LIMIT 1;

  -- Delete the fuel expense
  DELETE FROM fuel_expenses WHERE id = expense_id;

  -- Recalculate payroll if exists
  IF v_user_payroll_id IS NOT NULL THEN
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      RAISE LOG 'delete_fuel_expense: Successfully recalculated payroll % for driver %',
        v_user_payroll_id, v_driver_user_id;
    EXCEPTION 
      WHEN OTHERS THEN
        RAISE WARNING 'delete_fuel_expense: Error recalculating payroll for user %: %',
          v_user_payroll_id, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gasto eliminado y payroll recalculado exitosamente',
    'expense_id', expense_id,
    'payment_period_id', v_payment_period_id,
    'user_payroll_id', v_user_payroll_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;

-- 2. Actualizar función create_or_update para manejar cambio de conductor
CREATE OR REPLACE FUNCTION public.create_or_update_fuel_expense_with_validation(
  expense_data jsonb,
  expense_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_expense RECORD;
  operation_type TEXT;
  payment_period_id UUID;
  transaction_date DATE;
  driver_user_id UUID;
  user_payroll_id UUID;
  
  -- Variables para cambio de conductor
  old_driver_user_id UUID;
  old_payment_period_id UUID;
  old_user_payroll_id UUID;
  driver_changed BOOLEAN := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract driver_user_id and transaction date
  driver_user_id := (expense_data->>'driver_user_id')::UUID;
  transaction_date := (expense_data->>'transaction_date')::DATE;
  
  IF driver_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_DRIVER_USER_ID_REQUIRED';
  END IF;
  
  IF transaction_date IS NULL THEN
    RAISE EXCEPTION 'ERROR_TRANSACTION_DATE_REQUIRED';
  END IF;

  -- Get company ID from driver user
  SELECT DISTINCT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = driver_user_id
    AND ucr.is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_DRIVER_COMPANY_NOT_FOUND';
  END IF;

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_FUEL_EXPENSES';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN expense_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ✅ NUEVO: Para UPDATE, detectar si cambió el conductor
  IF operation_type = 'UPDATE' THEN
    SELECT driver_user_id, payment_period_id
    INTO old_driver_user_id, old_payment_period_id
    FROM fuel_expenses
    WHERE id = expense_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ERROR_FUEL_EXPENSE_NOT_FOUND';
    END IF;
    
    -- Detectar cambio de conductor
    IF old_driver_user_id != driver_user_id THEN
      driver_changed := true;
      
      -- Obtener el payroll del conductor anterior para recalcular después
      SELECT id INTO old_user_payroll_id
      FROM user_payrolls
      WHERE user_id = old_driver_user_id
        AND company_payment_period_id = old_payment_period_id
      LIMIT 1;
      
      RAISE LOG 'create_or_update_fuel_expense: Driver changed from % to %, will recalculate both payrolls',
        old_driver_user_id, driver_user_id;
    END IF;
    
    -- Validate access to the expense
    IF NOT EXISTS (
      SELECT 1 FROM fuel_expenses fe
      WHERE fe.id = expense_id
      AND fe.driver_user_id IN (
        SELECT ucr.user_id 
        FROM user_company_roles ucr
        WHERE ucr.company_id = target_company_id
        AND ucr.is_active = true
      )
    ) THEN
      RAISE EXCEPTION 'ERROR_FUEL_EXPENSE_NOT_FOUND';
    END IF;
  END IF;

  -- First check if a payment period already exists for this transaction date
  SELECT id INTO payment_period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date <= transaction_date
    AND period_end_date >= transaction_date
  LIMIT 1;

  -- If no existing period found, create one
  IF payment_period_id IS NULL THEN
    payment_period_id := create_company_payment_period_if_needed(
      target_company_id, 
      transaction_date, 
      current_user_id
    );
  END IF;
  
  -- Final validation that we have a valid payment period
  IF payment_period_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Could not find or create payment period for date %', transaction_date;
  END IF;

  -- Override the payment_period_id in expense_data with the ensured period
  expense_data := expense_data || jsonb_build_object('payment_period_id', payment_period_id);

  -- Create or update fuel expense
  IF operation_type = 'CREATE' THEN
    INSERT INTO fuel_expenses (
      payment_period_id,
      driver_user_id,
      transaction_date,
      gallons_purchased,
      price_per_gallon,
      total_amount,
      station_name,
      station_city,
      station_state,
      card_last_five,
      fuel_type,
      fees,
      discount_amount,
      gross_amount,
      notes,
      receipt_url,
      is_verified,
      status,
      invoice_number,
      created_by,
      updated_at
    ) VALUES (
      payment_period_id,
      driver_user_id,
      transaction_date,
      (expense_data->>'gallons_purchased')::NUMERIC,
      (expense_data->>'price_per_gallon')::NUMERIC,
      (expense_data->>'total_amount')::NUMERIC,
      expense_data->>'station_name',
      expense_data->>'station_city',
      expense_data->>'station_state',
      expense_data->>'card_last_five',
      COALESCE(expense_data->>'fuel_type', 'diesel'),
      (expense_data->>'fees')::NUMERIC,
      (expense_data->>'discount_amount')::NUMERIC,
      (expense_data->>'gross_amount')::NUMERIC,
      expense_data->>'notes',
      expense_data->>'receipt_url',
      COALESCE((expense_data->>'is_verified')::BOOLEAN, false),
      COALESCE(expense_data->>'status', 'pending'),
      expense_data->>'invoice_number',
      current_user_id,
      now()
    ) RETURNING * INTO result_expense;
  ELSE
    UPDATE fuel_expenses SET
      payment_period_id = payment_period_id,
      driver_user_id = driver_user_id, -- ✅ Permitir cambio de conductor
      transaction_date = transaction_date,
      gallons_purchased = COALESCE((expense_data->>'gallons_purchased')::NUMERIC, gallons_purchased),
      price_per_gallon = COALESCE((expense_data->>'price_per_gallon')::NUMERIC, price_per_gallon),
      total_amount = COALESCE((expense_data->>'total_amount')::NUMERIC, total_amount),
      station_name = COALESCE(expense_data->>'station_name', station_name),
      station_city = COALESCE(expense_data->>'station_city', station_city),
      station_state = COALESCE(expense_data->>'station_state', station_state),
      card_last_five = COALESCE(expense_data->>'card_last_five', card_last_five),
      fuel_type = COALESCE(expense_data->>'fuel_type', fuel_type),
      fees = COALESCE((expense_data->>'fees')::NUMERIC, fees),
      discount_amount = COALESCE((expense_data->>'discount_amount')::NUMERIC, discount_amount),
      gross_amount = COALESCE((expense_data->>'gross_amount')::NUMERIC, gross_amount),
      notes = COALESCE(expense_data->>'notes', notes),
      receipt_url = COALESCE(expense_data->>'receipt_url', receipt_url),
      is_verified = COALESCE((expense_data->>'is_verified')::BOOLEAN, is_verified),
      status = COALESCE(expense_data->>'status', status),
      invoice_number = COALESCE(expense_data->>'invoice_number', invoice_number),
      updated_at = now()
    WHERE id = expense_id
    RETURNING * INTO result_expense;
  END IF;

  -- ✅ NUEVO: Si cambió el conductor, recalcular el payroll del conductor ANTERIOR
  IF driver_changed AND old_user_payroll_id IS NOT NULL THEN
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(old_user_payroll_id);
      RAISE LOG 'create_or_update_fuel_expense: Recalculated OLD driver payroll % for driver %',
        old_user_payroll_id, old_driver_user_id;
    EXCEPTION 
      WHEN OTHERS THEN
        RAISE WARNING 'create_or_update_fuel_expense: Error recalculating old driver payroll %: %',
          old_user_payroll_id, SQLERRM;
    END;
  END IF;

  -- Asegurar que existe el user_payroll para el driver NUEVO (o actual)
  SELECT id INTO user_payroll_id
  FROM user_payrolls
  WHERE user_id = driver_user_id
    AND company_payment_period_id = payment_period_id
  LIMIT 1;

  -- Si no existe, crear el user_payroll
  IF user_payroll_id IS NULL THEN
    INSERT INTO user_payrolls (
      user_id,
      company_payment_period_id,
      company_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      net_payment,
      has_negative_balance,
      payment_status,
      calculated_by
    ) VALUES (
      driver_user_id,
      payment_period_id,
      target_company_id,
      0,
      0,
      0,
      0,
      0,
      false,
      'calculated',
      current_user_id
    ) RETURNING id INTO user_payroll_id;
    
    RAISE LOG 'create_or_update_fuel_expense: Created new user_payroll % for driver % and period %',
      user_payroll_id, driver_user_id, payment_period_id;
  END IF;

  -- Recalcular el payroll del driver NUEVO (o actual)
  BEGIN
    PERFORM calculate_user_payment_period_with_validation(user_payroll_id);
    RAISE LOG 'create_or_update_fuel_expense: Successfully recalculated NEW driver payroll % for driver %',
      user_payroll_id, driver_user_id;
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE WARNING 'create_or_update_fuel_expense: Error recalculating payroll for user %: %',
        user_payroll_id, SQLERRM;
  END;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'driver_changed', driver_changed,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Gasto de combustible creado y payroll recalculado exitosamente'
      WHEN driver_changed THEN 'Gasto actualizado, conductor cambiado, ambos payrolls recalculados'
      ELSE 'Gasto de combustible actualizado y payroll recalculado exitosamente'
    END,
    'expense', row_to_json(result_expense),
    'payment_period_id', payment_period_id,
    'user_payroll_id', user_payroll_id,
    'old_user_payroll_id', old_user_payroll_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;