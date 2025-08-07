-- Retry: fix INTO usage by splitting queries
DROP FUNCTION IF EXISTS public.update_fuel_expense_with_validation(uuid, jsonb);
DROP FUNCTION IF EXISTS public.delete_fuel_expense_with_validation(uuid);

-- Update fuel expense with validation (parameter name kept as update_data)
CREATE OR REPLACE FUNCTION public.update_fuel_expense_with_validation(
  expense_id uuid,
  update_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fe_rec fuel_expenses%ROWTYPE;
  v_company_id uuid;
  v_is_locked boolean;
  v_has_access boolean;
  v_cpp_id uuid; -- company_payment_periods.id
BEGIN
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Load the expense row
  SELECT * INTO fe_rec FROM fuel_expenses WHERE id = expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Gasto de combustible no encontrado');
  END IF;

  -- Load related company and period lock status
  SELECT cpp.company_id, cpp.is_locked, cpp.id
  INTO v_company_id, v_is_locked, v_cpp_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
  WHERE dpc.id = fe_rec.payment_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período relacionado no encontrado');
  END IF;

  -- Check access: same company membership OR is the driver
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = v_company_id
      AND ucr.is_active = true
  ) OR (fe_rec.driver_user_id = auth.uid())
  INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes permisos para actualizar este gasto');
  END IF;

  -- Check lock
  IF v_is_locked OR is_period_locked(v_cpp_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período está cerrado; no se puede modificar');
  END IF;

  -- Perform update
  UPDATE fuel_expenses SET
    transaction_date   = COALESCE(NULLIF(update_data->>'transaction_date','')::timestamptz, transaction_date),
    gallons_purchased  = COALESCE((update_data->>'gallons_purchased')::numeric, gallons_purchased),
    price_per_gallon   = COALESCE((update_data->>'price_per_gallon')::numeric, price_per_gallon),
    gross_amount       = COALESCE((update_data->>'gross_amount')::numeric, gross_amount),
    fees               = COALESCE((update_data->>'fees')::numeric, fees),
    discount_amount    = COALESCE((update_data->>'discount_amount')::numeric, discount_amount),
    total_amount       = COALESCE((update_data->>'total_amount')::numeric, total_amount),
    station_name       = COALESCE(NULLIF(update_data->>'station_name',''), station_name),
    station_state      = COALESCE(NULLIF(update_data->>'station_state',''), station_state),
    fuel_type          = COALESCE(NULLIF(update_data->>'fuel_type',''), fuel_type),
    notes              = COALESCE(NULLIF(update_data->>'notes',''), notes),
    invoice_number     = COALESCE(NULLIF(update_data->>'invoice_number',''), invoice_number),
    card_last_five     = COALESCE(NULLIF(update_data->>'card_last_five',''), card_last_five),
    is_verified        = COALESCE((update_data->>'is_verified')::boolean, is_verified),
    vehicle_id         = COALESCE(NULLIF(update_data->>'vehicle_id','')::uuid, vehicle_id),
    receipt_url        = COALESCE(NULLIF(update_data->>'receipt_url',''), receipt_url),
    updated_at         = now()
  WHERE id = expense_id
  RETURNING * INTO fe_rec;

  -- Recalculate
  PERFORM recalculate_payment_period_totals(fe_rec.payment_period_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gasto actualizado exitosamente',
    'expense_id', fe_rec.id,
    'payment_period_id', fe_rec.payment_period_id,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error actualizando gasto de combustible: %', SQLERRM;
END;
$$;

-- Delete fuel expense with validation
CREATE OR REPLACE FUNCTION public.delete_fuel_expense_with_validation(
  expense_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment_period_id uuid; -- driver_period_calculations.id
  v_company_id uuid;
  v_is_locked boolean;
  v_has_access boolean;
  v_cpp_id uuid; -- company_payment_periods.id
BEGIN
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Load expense payment period id
  SELECT payment_period_id INTO v_payment_period_id FROM fuel_expenses WHERE id = expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Gasto de combustible no encontrado');
  END IF;

  -- Load related company and lock status
  SELECT cpp.company_id, cpp.is_locked, cpp.id
  INTO v_company_id, v_is_locked, v_cpp_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
  WHERE dpc.id = v_payment_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período relacionado no encontrado');
  END IF;

  -- Check access: same company membership OR is the driver who owns the expense
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = v_company_id
      AND ucr.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM driver_period_calculations dpc2
    WHERE dpc2.id = v_payment_period_id AND dpc2.driver_user_id = auth.uid()
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes permisos para eliminar este gasto');
  END IF;

  -- Check lock
  IF v_is_locked OR is_period_locked(v_cpp_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período está cerrado; no se puede eliminar');
  END IF;

  -- Delete
  DELETE FROM fuel_expenses WHERE id = expense_id;

  -- Recalculate
  PERFORM recalculate_payment_period_totals(v_payment_period_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gasto eliminado exitosamente',
    'expense_id', expense_id,
    'payment_period_id', v_payment_period_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error eliminando gasto de combustible: %', SQLERRM;
END;
$$;