-- Corregir triggers para permitir CUALQUIER transición a 'applied' (no solo desde approved)
-- Esto es necesario porque algunos registros pueden estar en 'pending' cuando se marca como pagado

-- 1. Actualizar trigger de FUEL_EXPENSES para permitir pending/approved → applied
CREATE OR REPLACE FUNCTION check_fuel_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
  v_only_status_to_applied BOOLEAN := FALSE;
  v_only_vehicle_id_changed BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_driver_id, v_period_id);
  
  -- Si el período está pagado, verificar qué cambió
  IF v_is_paid THEN
    IF TG_OP = 'UPDATE' THEN
      -- Permitir transición de status: (pending o approved) → applied
      v_only_status_to_applied := (
        OLD.status IN ('pending', 'approved') AND 
        NEW.status = 'applied' AND
        -- Todos los demás campos deben permanecer iguales
        OLD.driver_user_id IS NOT DISTINCT FROM NEW.driver_user_id AND
        OLD.payment_period_id IS NOT DISTINCT FROM NEW.payment_period_id AND
        OLD.transaction_date IS NOT DISTINCT FROM NEW.transaction_date AND
        OLD.gallons_purchased IS NOT DISTINCT FROM NEW.gallons_purchased AND
        OLD.price_per_gallon IS NOT DISTINCT FROM NEW.price_per_gallon AND
        OLD.total_amount IS NOT DISTINCT FROM NEW.total_amount AND
        OLD.station_name IS NOT DISTINCT FROM NEW.station_name AND
        OLD.station_city IS NOT DISTINCT FROM NEW.station_city AND
        OLD.station_state IS NOT DISTINCT FROM NEW.station_state AND
        OLD.card_last_five IS NOT DISTINCT FROM NEW.card_last_five AND
        OLD.fuel_type IS NOT DISTINCT FROM NEW.fuel_type AND
        OLD.fees IS NOT DISTINCT FROM NEW.fees AND
        OLD.discount_amount IS NOT DISTINCT FROM NEW.discount_amount AND
        OLD.gross_amount IS NOT DISTINCT FROM NEW.gross_amount AND
        OLD.notes IS NOT DISTINCT FROM NEW.notes AND
        OLD.receipt_url IS NOT DISTINCT FROM NEW.receipt_url AND
        OLD.invoice_number IS NOT DISTINCT FROM NEW.invoice_number AND
        OLD.vehicle_id IS NOT DISTINCT FROM NEW.vehicle_id
      );
      
      IF v_only_status_to_applied THEN
        RETURN NEW;
      END IF;
      
      -- También permitir cambio solo de vehicle_id (lógica existente)
      v_only_vehicle_id_changed := (
        OLD.driver_user_id IS NOT DISTINCT FROM NEW.driver_user_id AND
        OLD.payment_period_id IS NOT DISTINCT FROM NEW.payment_period_id AND
        OLD.transaction_date IS NOT DISTINCT FROM NEW.transaction_date AND
        OLD.gallons_purchased IS NOT DISTINCT FROM NEW.gallons_purchased AND
        OLD.price_per_gallon IS NOT DISTINCT FROM NEW.price_per_gallon AND
        OLD.total_amount IS NOT DISTINCT FROM NEW.total_amount AND
        OLD.station_name IS NOT DISTINCT FROM NEW.station_name AND
        OLD.station_city IS NOT DISTINCT FROM NEW.station_city AND
        OLD.station_state IS NOT DISTINCT FROM NEW.station_state AND
        OLD.card_last_five IS NOT DISTINCT FROM NEW.card_last_five AND
        OLD.fuel_type IS NOT DISTINCT FROM NEW.fuel_type AND
        OLD.fees IS NOT DISTINCT FROM NEW.fees AND
        OLD.discount_amount IS NOT DISTINCT FROM NEW.discount_amount AND
        OLD.gross_amount IS NOT DISTINCT FROM NEW.gross_amount AND
        OLD.notes IS NOT DISTINCT FROM NEW.notes AND
        OLD.receipt_url IS NOT DISTINCT FROM NEW.receipt_url AND
        OLD.status IS NOT DISTINCT FROM NEW.status AND
        OLD.invoice_number IS NOT DISTINCT FROM NEW.invoice_number AND
        OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id
      );
      
      IF v_only_vehicle_id_changed THEN
        RETURN NEW;
      END IF;
    END IF;
    
    -- Para cualquier otro cambio, bloquear
    SELECT period_start_date, period_end_date
    INTO v_period_start_date, v_period_end_date
    FROM company_payment_periods
    WHERE id = v_period_id;
    
    RAISE EXCEPTION 'PAID_PERIOD_IMMUTABLE_FUEL|%|%', v_period_start_date, v_period_end_date
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 2. Actualizar la función de pago para cambiar fuel_expenses de pending/approved a applied
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
  v_updated_loads INTEGER;
  v_updated_fuel INTEGER;
  v_updated_income INTEGER;
  v_updated_expenses INTEGER;
BEGIN
  SELECT user_id, company_payment_period_id 
  INTO v_user_id, v_period_id
  FROM user_payrolls 
  WHERE id = p_calculation_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CALCULATION_NOT_FOUND'
    );
  END IF;

  v_payment_date := CURRENT_DATE;

  -- Actualizar el payroll
  UPDATE user_payrolls
  SET 
    payment_status = 'paid',
    payment_date = v_payment_date,
    payment_method = p_payment_method,
    payment_reference = p_payment_reference,
    payment_notes = p_notes,
    updated_at = now()
  WHERE id = p_calculation_id
    AND payment_status != 'paid';

  -- 1. Marcar loads como 'applied' (inmutables)
  UPDATE loads
  SET 
    payment_status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status = 'approved';

  GET DIAGNOSTICS v_updated_loads = ROW_COUNT;

  -- 2. Marcar fuel_expenses como 'applied' (desde pending o approved)
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_fuel = ROW_COUNT;

  -- 3. Marcar other_income como 'applied'
  UPDATE other_income
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_income = ROW_COUNT;

  -- 4. Marcar expense_instances como 'applied'
  UPDATE expense_instances
  SET 
    status = 'applied',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('planned', 'approved');

  GET DIAGNOSTICS v_updated_expenses = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_loads', v_updated_loads,
    'updated_fuel', v_updated_fuel,
    'updated_income', v_updated_income,
    'updated_expenses', v_updated_expenses
  );
END;
$$;

COMMENT ON FUNCTION check_fuel_period_immutability IS 
  'Trigger que protege inmutabilidad de fuel_expenses en períodos pagados. Permite: 1) cambio de vehicle_id, 2) transición de status: (pending|approved) → applied durante el pago.';