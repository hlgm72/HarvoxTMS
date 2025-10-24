
-- 🔧 PREVENIR DUPLICACIÓN DE TRANSACCIONES DE COMBUSTIBLE

-- 1. Agregar constraint único para prevenir duplicados
-- Combinación de driver + invoice + fecha debe ser única
ALTER TABLE fuel_expenses 
ADD CONSTRAINT fuel_expenses_unique_invoice_per_driver 
UNIQUE (driver_user_id, invoice_number, transaction_date);

-- 2. Modificar la función para manejar duplicados con UPSERT
CREATE OR REPLACE FUNCTION public.create_or_update_fuel_expense_with_validation(expense_data jsonb, expense_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expense_id uuid;
  v_driver_user_id uuid;
  v_payment_period_id uuid;
  v_company_payment_period_id uuid;
  v_transaction_date date;
  v_invoice_number text;
  v_is_update boolean := (expense_id IS NOT NULL);
  v_old_driver_id uuid;
  v_old_period_id uuid;
  v_user_payroll_id uuid;
  v_company_id uuid;
  v_existing_id uuid;
BEGIN
  v_driver_user_id := (expense_data->>'driver_user_id')::uuid;
  v_payment_period_id := (expense_data->>'payment_period_id')::uuid;
  v_transaction_date := (expense_data->>'transaction_date')::date;
  v_invoice_number := expense_data->>'invoice_number';

  SELECT company_id INTO v_company_id
  FROM user_company_roles
  WHERE user_id = v_driver_user_id AND is_active = true
  LIMIT 1;

  IF v_payment_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO v_company_payment_period_id
    FROM user_payrolls
    WHERE id = v_payment_period_id;
  END IF;

  IF v_company_payment_period_id IS NULL AND v_transaction_date IS NOT NULL THEN
    v_company_payment_period_id := create_company_payment_period_if_needed(
      v_company_id, v_transaction_date, auth.uid()
    );
  END IF;

  -- 🔧 NUEVO: Verificar si ya existe una transacción con el mismo invoice
  IF NOT v_is_update AND v_invoice_number IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM fuel_expenses
    WHERE driver_user_id = v_driver_user_id
      AND invoice_number = v_invoice_number
      AND transaction_date = v_transaction_date
    LIMIT 1;
    
    -- Si ya existe, actualizar en lugar de crear duplicado
    IF v_existing_id IS NOT NULL THEN
      v_is_update := true;
      expense_id := v_existing_id;
      
      RAISE NOTICE 'Transacción duplicada detectada, actualizando registro existente: %', v_existing_id;
    END IF;
  END IF;

  IF v_is_update THEN
    SELECT driver_user_id, payment_period_id 
    INTO v_old_driver_id, v_old_period_id
    FROM fuel_expenses WHERE id = expense_id;

    UPDATE fuel_expenses SET
      driver_user_id = v_driver_user_id,
      payment_period_id = v_company_payment_period_id,
      transaction_date = v_transaction_date,
      gallons_purchased = (expense_data->>'gallons_purchased')::numeric,
      price_per_gallon = (expense_data->>'price_per_gallon')::numeric,
      total_amount = (expense_data->>'total_amount')::numeric,
      station_name = expense_data->>'station_name',
      station_city = expense_data->>'station_city',
      station_state = expense_data->>'station_state',
      card_last_five = expense_data->>'card_last_five',
      fuel_type = COALESCE(expense_data->>'fuel_type', 'diesel'),
      fees = (expense_data->>'fees')::numeric,
      discount_amount = (expense_data->>'discount_amount')::numeric,
      gross_amount = (expense_data->>'gross_amount')::numeric,
      notes = expense_data->>'notes',
      receipt_url = expense_data->>'receipt_url',
      is_verified = COALESCE((expense_data->>'is_verified')::boolean, false),
      status = COALESCE(expense_data->>'status', 'pending'),
      invoice_number = expense_data->>'invoice_number',
      vehicle_id = (expense_data->>'vehicle_id')::uuid,
      updated_at = now()
    WHERE id = expense_id
    RETURNING id INTO v_expense_id;
  ELSE
    INSERT INTO fuel_expenses (
      driver_user_id, payment_period_id, transaction_date,
      gallons_purchased, price_per_gallon, total_amount,
      station_name, station_city, station_state, card_last_five,
      fuel_type, fees, discount_amount, gross_amount,
      notes, receipt_url, is_verified, status,
      invoice_number, vehicle_id, created_by
    ) VALUES (
      v_driver_user_id, v_company_payment_period_id, v_transaction_date,
      (expense_data->>'gallons_purchased')::numeric,
      (expense_data->>'price_per_gallon')::numeric,
      (expense_data->>'total_amount')::numeric,
      expense_data->>'station_name',
      expense_data->>'station_city',
      expense_data->>'station_state',
      expense_data->>'card_last_five',
      COALESCE(expense_data->>'fuel_type', 'diesel'),
      (expense_data->>'fees')::numeric,
      (expense_data->>'discount_amount')::numeric,
      (expense_data->>'gross_amount')::numeric,
      expense_data->>'notes',
      expense_data->>'receipt_url',
      COALESCE((expense_data->>'is_verified')::boolean, false),
      COALESCE(expense_data->>'status', 'pending'),
      expense_data->>'invoice_number',
      (expense_data->>'vehicle_id')::uuid,
      auth.uid()
    ) RETURNING id INTO v_expense_id;
  END IF;

  -- Recalcular payroll del usuario
  IF v_driver_user_id IS NOT NULL AND v_company_payment_period_id IS NOT NULL THEN
    SELECT id INTO v_user_payroll_id
    FROM user_payrolls
    WHERE user_id = v_driver_user_id 
    AND company_payment_period_id = v_company_payment_period_id;

    IF v_user_payroll_id IS NULL THEN
      INSERT INTO user_payrolls (
        user_id, company_payment_period_id, company_id,
        gross_earnings, fuel_expenses, total_deductions,
        other_income, net_payment, payment_status,
        calculated_by, payroll_role
      ) VALUES (
        v_driver_user_id, v_company_payment_period_id, v_company_id,
        0, 0, 0, 0, 0, 'calculated', auth.uid(), 'company_driver'
      ) RETURNING id INTO v_user_payroll_id;
    END IF;

    PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fuel_expense_id', v_expense_id,
    'was_duplicate', v_existing_id IS NOT NULL,
    'user_payroll_id', v_user_payroll_id
  );
END;
$function$;
