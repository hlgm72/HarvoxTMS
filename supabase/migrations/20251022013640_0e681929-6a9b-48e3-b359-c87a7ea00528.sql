-- ===============================================
-- IMPLEMENTAR FLUJO DE ESTADOS INMUTABLES PARA FUEL EXPENSES
-- ===============================================
-- 
-- OBJETIVO: Cuando un Payroll es marcado como pagado, todas las
-- transacciones de combustible pasan de 'approved' a 'applied' y
-- se vuelven completamente inmutables (no se pueden editar ni eliminar)
--
-- Estados del flujo:
-- - pending: Transacción recibida, necesita verificación
-- - approved: Transacción verificada, lista para cálculo
-- - applied: Transacción incluida en Payroll PAGADO (INMUTABLE)
-- - disputed: Transacción en disputa (opcional)
-- - rejected: Transacción rechazada (opcional)

-- ===============================================
-- 1. ACTUALIZAR mark_driver_as_paid_with_validation
-- ===============================================
DROP FUNCTION IF EXISTS public.mark_driver_as_paid_with_validation(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.mark_driver_as_paid_with_validation(
  calculation_id UUID,
  payment_method_used TEXT DEFAULT NULL,
  payment_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  calculation_record RECORD;
  expense_instances_updated INTEGER;
  fuel_expenses_updated INTEGER;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE CALCULATION EXISTS AND ACCESS
  -- ================================
  
  SELECT up.*, cpp.company_id, cpp.id as period_id
  INTO calculation_record
  FROM user_payrolls up
  JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE up.id = calculation_id
  AND ucr.user_id = current_user_id
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado o sin permisos para marcarlo como pagado';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Check if already paid
  IF calculation_record.payment_status = 'paid' THEN
    RAISE EXCEPTION 'El conductor ya está marcado como pagado';
  END IF;

  -- Validate payment status is ready for payment
  IF calculation_record.payment_status NOT IN ('calculated', 'approved', 'pending') THEN
    RAISE EXCEPTION 'El estado del cálculo no permite el pago. Estado actual: %', calculation_record.payment_status;
  END IF;

  -- ================================
  -- 3. MARK AS PAID WITH ACID GUARANTEES
  -- ================================
  
  -- Update payroll status
  UPDATE user_payrolls
  SET 
    payment_status = 'paid',
    paid_at = now(),
    paid_by = current_user_id,
    payment_method = payment_method_used,
    payment_reference = payment_ref,
    payment_notes = notes,
    updated_at = now()
  WHERE id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Error actualizando el estado de pago';
  END IF;

  -- ✅ Actualizar expense_instances tanto 'planned' como 'cancelled' a 'applied'
  UPDATE expense_instances
  SET 
    status = 'applied',
    applied_at = now()
  WHERE payment_period_id = calculation_record.period_id
  AND user_id = calculation_record.user_id
  AND status IN ('planned', 'cancelled');

  GET DIAGNOSTICS expense_instances_updated = ROW_COUNT;

  -- ✅ NUEVO: Actualizar fuel_expenses de 'approved' a 'applied' (INMUTABLES)
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE payment_period_id = calculation_record.period_id
  AND driver_user_id = calculation_record.user_id
  AND status = 'approved';

  GET DIAGNOSTICS fuel_expenses_updated = ROW_COUNT;

  -- ================================
  -- 4. RETURN SUCCESS RESULT
  -- ================================
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conductor marcado como pagado exitosamente',
    'calculation_id', calculation_id,
    'user_id', calculation_record.user_id,
    'net_payment', calculation_record.net_payment,
    'payment_method', payment_method_used,
    'payment_reference', payment_ref,
    'paid_by', current_user_id,
    'paid_at', now(),
    'expense_instances_updated', expense_instances_updated,
    'fuel_expenses_updated', fuel_expenses_updated
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en pago ACID de conductor: %', SQLERRM;
END;
$$;

-- ===============================================
-- 2. ACTUALIZAR mark_multiple_drivers_as_paid_with_validation
-- ===============================================
DROP FUNCTION IF EXISTS public.mark_multiple_drivers_as_paid_with_validation(UUID[], TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.mark_multiple_drivers_as_paid_with_validation(
  calculation_ids UUID[],
  payment_method_used TEXT DEFAULT NULL,
  payment_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculation_record RECORD;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::jsonb;
  period_id UUID;
  current_user_id UUID;
  fuel_expenses_count INTEGER := 0;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF calculation_ids IS NULL OR array_length(calculation_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se proporcionaron cálculos para procesar'
    );
  END IF;

  -- Procesar cada cálculo
  FOR calculation_record IN
    SELECT up.*, cpp.company_id, cpp.id as period_id, cpp.is_locked
    FROM user_payrolls up
    JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
    WHERE up.id = ANY(calculation_ids)
  LOOP
    BEGIN
      -- Verificar permisos
      IF NOT EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = current_user_id
        AND company_id = calculation_record.company_id
        AND role IN ('company_owner', 'operations_manager', 'superadmin')
        AND is_active = true
      ) THEN
        errors := errors || jsonb_build_object(
          'calculation_id', calculation_record.id,
          'error', 'Sin permisos para esta empresa'
        );
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Verificar que no esté ya pagado
      IF calculation_record.payment_status = 'paid' THEN
        errors := errors || jsonb_build_object(
          'calculation_id', calculation_record.id,
          'error', 'Ya está marcado como pagado'
        );
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Marcar como pagado
      UPDATE user_payrolls
      SET 
        payment_status = 'paid',
        paid_at = now(),
        paid_by = current_user_id,
        payment_method = payment_method_used,
        payment_reference = payment_ref,
        payment_notes = notes,
        updated_at = now()
      WHERE id = calculation_record.id;

      -- Actualizar expense_instances a 'applied'
      UPDATE expense_instances
      SET 
        status = 'applied',
        applied_at = now()
      WHERE payment_period_id = calculation_record.period_id
      AND user_id = calculation_record.user_id
      AND status IN ('planned', 'cancelled');

      -- ✅ NUEVO: Actualizar fuel_expenses a 'applied'
      UPDATE fuel_expenses
      SET 
        status = 'applied',
        updated_at = now()
      WHERE payment_period_id = calculation_record.period_id
      AND driver_user_id = calculation_record.user_id
      AND status = 'approved';

      GET DIAGNOSTICS fuel_expenses_count = ROW_COUNT;
      
      success_count := success_count + 1;
      period_id := calculation_record.period_id;

    EXCEPTION WHEN OTHERS THEN
      errors := errors || jsonb_build_object(
        'calculation_id', calculation_record.id,
        'error', SQLERRM
      );
      error_count := error_count + 1;
    END;
  END LOOP;

  IF success_count = 0 AND error_count > 0 THEN
    RAISE EXCEPTION 'No se pudieron procesar ninguno de los pagos: %', errors::text;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Procesados %s pagos exitosamente, %s errores', success_count, error_count),
    'success_count', success_count,
    'error_count', error_count,
    'errors', errors,
    'fuel_expenses_updated', fuel_expenses_count,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en procesamiento ACID de pagos múltiples: %', SQLERRM;
END;
$$;

-- ===============================================
-- 3. ACTUALIZAR create_or_update_fuel_expense_with_validation
-- ===============================================
DROP FUNCTION IF EXISTS public.create_or_update_fuel_expense_with_validation(jsonb, uuid);

CREATE OR REPLACE FUNCTION public.create_or_update_fuel_expense_with_validation(
  expense_data jsonb,
  expense_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expense_id uuid;
  v_driver_user_id uuid;
  v_payment_period_id uuid;
  v_transaction_date date;
  v_is_update boolean := (expense_id IS NOT NULL);
  v_old_driver_id uuid;
  v_old_period_id uuid;
  v_user_payroll_id uuid;
  v_company_id uuid;
  v_company_payment_period_id uuid;
  v_current_status text;
BEGIN
  v_driver_user_id := (expense_data->>'driver_user_id')::uuid;
  v_payment_period_id := (expense_data->>'payment_period_id')::uuid;
  v_transaction_date := (expense_data->>'transaction_date')::date;

  -- ✅ VALIDACIÓN: No permitir editar transacciones en estado 'applied'
  IF v_is_update THEN
    SELECT status INTO v_current_status
    FROM fuel_expenses
    WHERE id = expense_id;

    IF v_current_status = 'applied' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'ERROR_IMMUTABLE_EXPENSE: No se puede modificar una transacción de combustible que ya fue aplicada a un pago. Esta transacción es inmutable.'
      );
    END IF;
  END IF;

  SELECT company_id INTO v_company_id
  FROM user_company_roles
  WHERE user_id = v_driver_user_id AND is_active = true
  LIMIT 1;

  IF v_payment_period_id IS NULL AND v_transaction_date IS NOT NULL THEN
    v_payment_period_id := create_company_payment_period_if_needed(
      v_company_id, v_transaction_date, auth.uid()
    );
  END IF;

  IF v_is_update THEN
    SELECT driver_user_id, payment_period_id 
    INTO v_old_driver_id, v_old_period_id
    FROM fuel_expenses WHERE id = expense_id;

    UPDATE fuel_expenses SET
      driver_user_id = v_driver_user_id,
      payment_period_id = v_payment_period_id,
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
      status = COALESCE(expense_data->>'status', status),
      invoice_number = expense_data->>'invoice_number',
      vehicle_id = (expense_data->>'vehicle_id')::uuid,
      updated_at = now()
    WHERE id = expense_id
    RETURNING id INTO v_expense_id;

    IF v_old_driver_id IS NOT NULL AND v_old_period_id IS NOT NULL THEN
      SELECT company_payment_period_id INTO v_company_payment_period_id
      FROM user_payrolls
      WHERE id = v_old_period_id;

      SELECT id INTO v_user_payroll_id
      FROM user_payrolls
      WHERE user_id = v_old_driver_id 
      AND company_payment_period_id = v_company_payment_period_id;
      
      IF v_user_payroll_id IS NOT NULL THEN
        PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      END IF;
    END IF;
  ELSE
    INSERT INTO fuel_expenses (
      driver_user_id, payment_period_id, transaction_date,
      gallons_purchased, price_per_gallon, total_amount,
      station_name, station_city, station_state, card_last_five,
      fuel_type, fees, discount_amount, gross_amount,
      notes, receipt_url, is_verified, status, invoice_number,
      vehicle_id, created_by
    ) VALUES (
      v_driver_user_id, v_payment_period_id, v_transaction_date,
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
    )
    RETURNING id INTO v_expense_id;
  END IF;

  IF v_driver_user_id IS NOT NULL AND v_payment_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO v_company_payment_period_id
    FROM user_payrolls
    WHERE id = v_payment_period_id;

    SELECT id INTO v_user_payroll_id
    FROM user_payrolls
    WHERE user_id = v_driver_user_id 
    AND company_payment_period_id = v_company_payment_period_id;

    IF v_user_payroll_id IS NULL THEN
      INSERT INTO user_payrolls (
        user_id, company_payment_period_id, company_id,
        gross_earnings, fuel_expenses, total_deductions, other_income,
        net_payment, has_negative_balance, payment_status, status, calculated_by
      ) VALUES (
        v_driver_user_id, v_company_payment_period_id, v_company_id,
        0, 0, 0, 0, 0, false, 'calculated', 'open', auth.uid()
      )
      RETURNING id INTO v_user_payroll_id;
    END IF;

    PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', v_expense_id,
    'payment_period_id', v_payment_period_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'ERROR_OPERATION_FAILED: ' || SQLERRM
  );
END;
$$;

-- ===============================================
-- 4. ACTUALIZAR delete_fuel_expense_with_validation
-- ===============================================
DROP FUNCTION IF EXISTS public.delete_fuel_expense_with_validation(uuid);

CREATE OR REPLACE FUNCTION public.delete_fuel_expense_with_validation(expense_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver_user_id uuid;
  v_payment_period_id uuid;
  v_user_payroll_id uuid;
  v_company_payment_period_id uuid;
  v_current_status text;
BEGIN
  -- ✅ VALIDACIÓN: No permitir eliminar transacciones en estado 'applied'
  SELECT driver_user_id, payment_period_id, status
  INTO v_driver_user_id, v_payment_period_id, v_current_status
  FROM fuel_expenses
  WHERE id = expense_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gasto no encontrado');
  END IF;

  IF v_current_status = 'applied' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ERROR_IMMUTABLE_EXPENSE: No se puede eliminar una transacción de combustible que ya fue aplicada a un pago. Esta transacción es inmutable.'
    );
  END IF;

  DELETE FROM fuel_expenses WHERE id = expense_id;

  IF v_driver_user_id IS NOT NULL AND v_payment_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO v_company_payment_period_id
    FROM user_payrolls
    WHERE id = v_payment_period_id;

    SELECT id INTO v_user_payroll_id
    FROM user_payrolls
    WHERE user_id = v_driver_user_id 
    AND company_payment_period_id = v_company_payment_period_id;

    IF v_user_payroll_id IS NOT NULL THEN
      PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;