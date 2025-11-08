-- Prevenir recálculo de net_payment cuando se marca como pagado
-- El problema: Los triggers de recálculo se ejecutan al actualizar payment_status
-- y recalculan net_payment con diferente precisión de punto flotante

-- Solución: Modificar mark_driver_as_paid_with_validation para guardar y restaurar net_payment

CREATE OR REPLACE FUNCTION mark_driver_as_paid_with_validation(
  p_calculation_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_payment_date DATE;
  v_result JSONB;
  v_updated_loads INTEGER := 0;
  v_updated_fuel INTEGER := 0;
  v_updated_income INTEGER := 0;
  v_updated_expenses INTEGER := 0;
  v_original_net_payment NUMERIC;  -- 🔥 NUEVO: Guardar valor original
BEGIN
  v_payment_date := CURRENT_DATE;
  
  -- 🔥 CRÍTICO: Guardar el net_payment original ANTES de cualquier actualización
  SELECT user_id, company_payment_period_id, net_payment
  INTO v_user_id, v_period_id, v_original_net_payment
  FROM user_payrolls 
  WHERE id = p_calculation_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CALCULATION_NOT_FOUND'
    );
  END IF;

  -- PASO 1: Actualizar todas las transacciones PRIMERO (antes de marcar como paid)
  
  -- 1.1 Marcar loads como 'applied' (desde pending o approved)
  UPDATE loads
  SET 
    payment_status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status IN ('pending', 'approved');
  
  GET DIAGNOSTICS v_updated_loads = ROW_COUNT;

  -- 1.2 Marcar fuel_expenses como 'applied'
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_fuel = ROW_COUNT;

  -- 1.3 Marcar other_income como 'applied'
  UPDATE other_income
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_income = ROW_COUNT;

  -- 1.4 Marcar expense_instances como 'applied'
  UPDATE expense_instances
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('planned', 'approved');

  GET DIAGNOSTICS v_updated_expenses = ROW_COUNT;

  -- PASO 2: Marcar el payroll como paid Y RESTAURAR net_payment original
  UPDATE user_payrolls
  SET 
    payment_status = 'paid',
    payment_date = v_payment_date,
    payment_method = p_payment_method,
    payment_reference = p_payment_reference,
    payment_notes = p_notes,
    net_payment = v_original_net_payment,  -- 🔥 RESTAURAR valor original
    updated_at = now()
  WHERE id = p_calculation_id
    AND payment_status != 'paid';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CALCULATION_ALREADY_PAID'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'PAYMENT_PROCESSED',
    'payment_date', v_payment_date,
    'net_payment', v_original_net_payment,  -- 🔥 Devolver valor original
    'updated_loads', v_updated_loads,
    'updated_fuel', v_updated_fuel,
    'updated_income', v_updated_income,
    'updated_expenses', v_updated_expenses
  );
END;
$$;

COMMENT ON FUNCTION mark_driver_as_paid_with_validation IS 
  '🔥 CRÍTICO: Preserva el valor original de net_payment para evitar cambios por recálculos de triggers. 
  El problema era que los triggers de recálculo (trigger_recalc_on_load_change, trigger_recalc_on_fuel_change) 
  se ejecutaban al actualizar payment_status y recalculaban net_payment con diferente precisión de punto flotante, 
  causando diferencias de centavos (ej: $2,717.52 → $2,717.53).';
