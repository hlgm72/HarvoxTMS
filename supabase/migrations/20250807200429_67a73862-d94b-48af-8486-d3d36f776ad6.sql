-- =====================================================
-- RPC ACID para Gestión de Gastos de Combustible
-- =====================================================
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
  acting_user uuid := auth.uid();
  target_period_id uuid;
  target_driver_id uuid;
  target_company_id uuid;
  dpc_id uuid;
  result_expense RECORD;
  err text;
BEGIN
  -- Authentication check
  IF acting_user IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract data from JSON
  target_period_id := (expense_data->>'payment_period_id')::uuid;
  target_driver_id := (expense_data->>'driver_user_id')::uuid;

  -- Get company ID from payment period
  SELECT cpp.company_id INTO target_company_id
  FROM company_payment_periods cpp
  WHERE cpp.id = target_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período de pago no encontrado';
  END IF;

  -- Permission: user must belong to this company
  IF NOT EXISTS (
     SELECT 1 FROM user_company_roles ucr
     WHERE ucr.user_id = acting_user
       AND ucr.company_id = target_company_id
       AND ucr.is_active = true
  ) THEN
     RAISE EXCEPTION 'No tienes permisos en esta empresa';
  END IF;

  -- Validate period is not locked
  IF is_period_locked(target_period_id) THEN
    RAISE EXCEPTION 'No se pueden modificar gastos: período bloqueado';
  END IF;

  -- Get driver calculation ID for this period
  SELECT dpc.id INTO dpc_id
  FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = target_period_id
    AND dpc.driver_user_id = target_driver_id
  LIMIT 1;

  -- Ensure driver calculation exists
  IF dpc_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      company_payment_period_id, driver_user_id,
      gross_earnings, fuel_expenses, total_deductions,
      other_income, total_income, net_payment,
      has_negative_balance, payment_status
    ) VALUES (
      target_period_id, target_driver_id,
      0, 0, 0, 0, 0, 0, false, 'calculated'
    ) RETURNING id INTO dpc_id;
  END IF;

  -- Create or update fuel expense
  IF expense_id IS NULL THEN
    -- CREATE new expense
    INSERT INTO fuel_expenses (
      driver_user_id, payment_period_id, transaction_date,
      gallons_purchased, price_per_gallon, total_amount,
      station_name, station_state, card_last_five,
      fuel_type, fees, discount_amount, gross_amount,
      notes, receipt_url, is_verified, status, created_by
    ) VALUES (
      target_driver_id,
      dpc_id, -- Use driver calculation ID
      COALESCE((expense_data->>'transaction_date')::timestamptz, now()),
      COALESCE((expense_data->>'gallons_purchased')::numeric, 0),
      COALESCE((expense_data->>'price_per_gallon')::numeric, 0),
      COALESCE((expense_data->>'total_amount')::numeric, 0),
      expense_data->>'station_name',
      expense_data->>'station_state',
      expense_data->>'card_last_five',
      COALESCE(expense_data->>'fuel_type', 'diesel'),
      COALESCE((expense_data->>'fees')::numeric, 0),
      COALESCE((expense_data->>'discount_amount')::numeric, 0),
      (expense_data->>'gross_amount')::numeric,
      expense_data->>'notes',
      expense_data->>'receipt_url',
      COALESCE((expense_data->>'is_verified')::boolean, false),
      COALESCE(expense_data->>'status', 'pending'),
      acting_user
    ) RETURNING * INTO result_expense;
  ELSE
    -- UPDATE existing expense
    UPDATE fuel_expenses SET
      gallons_purchased = COALESCE((expense_data->>'gallons_purchased')::numeric, gallons_purchased),
      price_per_gallon = COALESCE((expense_data->>'price_per_gallon')::numeric, price_per_gallon),
      total_amount = COALESCE((expense_data->>'total_amount')::numeric, total_amount),
      station_name = COALESCE(expense_data->>'station_name', station_name),
      station_state = COALESCE(expense_data->>'station_state', station_state),
      card_last_five = COALESCE(expense_data->>'card_last_five', card_last_five),
      fuel_type = COALESCE(expense_data->>'fuel_type', fuel_type),
      fees = COALESCE((expense_data->>'fees')::numeric, fees),
      discount_amount = COALESCE((expense_data->>'discount_amount')::numeric, discount_amount),
      gross_amount = COALESCE((expense_data->>'gross_amount')::numeric, gross_amount),
      notes = COALESCE(expense_data->>'notes', notes),
      receipt_url = COALESCE(expense_data->>'receipt_url', receipt_url),
      is_verified = COALESCE((expense_data->>'is_verified')::boolean, is_verified),
      status = COALESCE(expense_data->>'status', status),
      updated_at = now()
    WHERE id = expense_id
    RETURNING * INTO result_expense;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Gasto de combustible no encontrado';
    END IF;
  END IF;

  -- Recalculate driver period totals
  PERFORM recalculate_payment_period_totals(dpc_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN expense_id IS NULL THEN 'Gasto de combustible creado exitosamente' 
                    ELSE 'Gasto de combustible actualizado exitosamente' END,
    'fuel_expense', row_to_json(result_expense),
    'operation', CASE WHEN expense_id IS NULL THEN 'created' ELSE 'updated' END
  );

EXCEPTION WHEN OTHERS THEN
  err := SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', err);
END;
$$;

-- =====================================================
-- RPC ACID para Cierre de Períodos de Pago
-- =====================================================
CREATE OR REPLACE FUNCTION public.close_payment_period_with_validation(
  company_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  acting_user uuid := auth.uid();
  period_rec RECORD;
  total_drivers INTEGER;
  paid_drivers INTEGER;
  pending_drivers INTEGER;
  failed_drivers INTEGER;
  err text;
BEGIN
  -- Authentication check
  IF acting_user IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get period information
  SELECT * INTO period_rec
  FROM company_payment_periods
  WHERE id = company_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período de pago no encontrado';
  END IF;

  -- Permission: user must be admin in this company
  IF NOT EXISTS (
     SELECT 1 FROM user_company_roles ucr
     WHERE ucr.user_id = acting_user
       AND ucr.company_id = period_rec.company_id
       AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
       AND ucr.is_active = true
  ) THEN
     RAISE EXCEPTION 'No tienes permisos de administrador en esta empresa';
  END IF;

  -- Check if period is already closed
  IF period_rec.is_locked THEN
    RAISE EXCEPTION 'El período ya está cerrado';
  END IF;

  -- Count driver payment statuses
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid,
    COUNT(*) FILTER (WHERE payment_status IN ('calculated', 'approved')) as pending,
    COUNT(*) FILTER (WHERE payment_status = 'failed') as failed
  INTO total_drivers, paid_drivers, pending_drivers, failed_drivers
  FROM driver_period_calculations
  WHERE company_payment_period_id = company_period_id;

  -- Validate all drivers are paid
  IF pending_drivers > 0 THEN
    RAISE EXCEPTION 'No se puede cerrar el período: % conductores pendientes de pago', pending_drivers;
  END IF;

  IF failed_drivers > 0 THEN
    RAISE EXCEPTION 'No se puede cerrar el período: % pagos fallidos requieren atención', failed_drivers;
  END IF;

  IF total_drivers = 0 THEN
    RAISE EXCEPTION 'No se puede cerrar el período: no hay conductores en este período';
  END IF;

  -- Close the period
  UPDATE company_payment_periods SET
    status = 'closed',
    is_locked = true,
    locked_at = now(),
    locked_by = acting_user,
    updated_at = now()
  WHERE id = company_period_id;

  -- Generate period completion report (optional)
  -- This could trigger additional processing like report generation

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período cerrado exitosamente',
    'period_id', company_period_id,
    'closed_at', now(),
    'summary', jsonb_build_object(
      'total_drivers', total_drivers,
      'paid_drivers', paid_drivers,
      'period_start', period_rec.period_start_date,
      'period_end', period_rec.period_end_date,
      'frequency', period_rec.period_frequency
    )
  );

EXCEPTION WHEN OTHERS THEN
  err := SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', err);
END;
$$;