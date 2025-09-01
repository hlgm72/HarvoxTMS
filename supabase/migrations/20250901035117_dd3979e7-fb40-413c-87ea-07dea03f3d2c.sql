-- Fix ambiguous column reference in UPDATE statement
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
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract transaction date for payment period creation
  transaction_date := (expense_data->>'transaction_date')::DATE;
  IF transaction_date IS NULL THEN
    RAISE EXCEPTION 'ERROR_TRANSACTION_DATE_REQUIRED';
  END IF;

  -- Get company ID from driver user
  SELECT DISTINCT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = (expense_data->>'driver_user_id')::UUID
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

  -- For UPDATE operations, validate expense exists and user has access to it via company
  IF operation_type = 'UPDATE' THEN
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
    AND status IN ('open', 'processing')
  LIMIT 1;

  -- If no existing period found, create one
  IF payment_period_id IS NULL THEN
    payment_period_id := create_payment_period_if_needed(target_company_id, transaction_date);
  END IF;
  
  -- Final validation that we have a valid payment period
  IF payment_period_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Could not find or create payment period for date %', transaction_date;
  END IF;

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
      created_by
    ) VALUES (
      payment_period_id,
      (expense_data->>'driver_user_id')::UUID,
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
      current_user_id
    ) RETURNING * INTO result_expense;
  ELSE
    UPDATE fuel_expenses SET
      payment_period_id = create_or_update_fuel_expense_with_validation.payment_period_id,
      transaction_date = create_or_update_fuel_expense_with_validation.transaction_date,
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

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Gasto de combustible creado exitosamente'
      ELSE 'Gasto de combustible actualizado exitosamente'
    END,
    'expense', row_to_json(result_expense),
    'payment_period_id', payment_period_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;