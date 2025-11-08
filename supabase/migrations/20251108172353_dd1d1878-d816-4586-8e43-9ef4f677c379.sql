
-- Actualizar triggers para permitir reversión de pagos (para testing)
-- Los triggers ahora permitirán cambios bidireccionales en el status durante testing

-- 1. Actualizar trigger de fuel_expenses para permitir reversión
CREATE OR REPLACE FUNCTION check_fuel_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
  v_only_status_change BOOLEAN := FALSE;
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
  
  IF v_is_paid THEN
    IF TG_OP = 'UPDATE' THEN
      -- Permitir cambios bidireccionales de status (para pago y reversión)
      v_only_status_change := (
        (
          -- Hacia adelante: pending/approved → applied
          (OLD.status IN ('pending', 'approved') AND NEW.status = 'applied') OR
          -- Hacia atrás: applied → pending/approved (para testing/reversión)
          (OLD.status = 'applied' AND NEW.status IN ('pending', 'approved'))
        ) AND
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
      
      IF v_only_status_change THEN
        RETURN NEW;
      END IF;
      
      -- También permitir cambio solo de vehicle_id
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

-- 2. Actualizar trigger de loads para permitir reversión
CREATE OR REPLACE FUNCTION check_load_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
  v_only_payment_status_change BOOLEAN := FALSE;
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
  
  IF v_is_paid THEN
    IF TG_OP = 'UPDATE' THEN
      -- Permitir cambios bidireccionales de payment_status
      v_only_payment_status_change := (
        (
          -- Hacia adelante: pending/approved → applied
          (OLD.payment_status IN ('pending', 'approved') AND NEW.payment_status = 'applied') OR
          -- Hacia atrás: applied → pending/approved (para testing/reversión)
          (OLD.payment_status = 'applied' AND NEW.payment_status IN ('pending', 'approved'))
        ) AND
        OLD.driver_user_id IS NOT DISTINCT FROM NEW.driver_user_id AND
        OLD.payment_period_id IS NOT DISTINCT FROM NEW.payment_period_id AND
        OLD.load_number IS NOT DISTINCT FROM NEW.load_number AND
        OLD.total_amount IS NOT DISTINCT FROM NEW.total_amount AND
        OLD.driver_earnings IS NOT DISTINCT FROM NEW.driver_earnings
      );
      
      IF v_only_payment_status_change THEN
        RETURN NEW;
      END IF;
    END IF;
    
    SELECT period_start_date, period_end_date
    INTO v_period_start_date, v_period_end_date
    FROM company_payment_periods
    WHERE id = v_period_id;
    
    RAISE EXCEPTION 'PAID_PERIOD_IMMUTABLE_LOAD|%|%', v_period_start_date, v_period_end_date
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 3. Actualizar trigger de expense_instances para permitir reversión
CREATE OR REPLACE FUNCTION check_expense_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
  v_only_status_change BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_user_id := NEW.user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_user_id, v_period_id);
  
  IF v_is_paid THEN
    IF TG_OP = 'UPDATE' THEN
      -- Permitir cambios bidireccionales de status
      v_only_status_change := (
        (
          -- Hacia adelante: planned/approved → applied
          (OLD.status IN ('planned', 'approved') AND NEW.status = 'applied') OR
          -- Hacia atrás: applied → planned/approved (para testing/reversión)
          (OLD.status = 'applied' AND NEW.status IN ('planned', 'approved'))
        ) AND
        OLD.user_id IS NOT DISTINCT FROM NEW.user_id AND
        OLD.payment_period_id IS NOT DISTINCT FROM NEW.payment_period_id AND
        OLD.amount IS NOT DISTINCT FROM NEW.amount
      );
      
      IF v_only_status_change THEN
        RETURN NEW;
      END IF;
    END IF;
    
    SELECT period_start_date, period_end_date
    INTO v_period_start_date, v_period_end_date
    FROM company_payment_periods
    WHERE id = v_period_id;
    
    RAISE EXCEPTION 'PAID_PERIOD_IMMUTABLE_EXPENSE|%|%', v_period_start_date, v_period_end_date
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION check_fuel_period_immutability IS 
  'Trigger que protege inmutabilidad de fuel_expenses en períodos pagados. Permite cambios bidireccionales de status para pago y reversión (testing).';

COMMENT ON FUNCTION check_load_period_immutability IS 
  'Trigger que protege inmutabilidad de loads en períodos pagados. Permite cambios bidireccionales de payment_status para pago y reversión (testing).';

COMMENT ON FUNCTION check_expense_period_immutability IS 
  'Trigger que protege inmutabilidad de expense_instances en períodos pagados. Permite cambios bidireccionales de status para pago y reversión (testing).';
