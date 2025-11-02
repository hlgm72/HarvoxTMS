
-- Modificar la función check_fuel_period_immutability para permitir actualizaciones de vehicle_id
CREATE OR REPLACE FUNCTION check_fuel_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
  v_only_vehicle_id_changed BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_driver_id, v_period_id);
  
  -- Si el período está pagado, verificar qué cambió
  IF v_is_paid THEN
    -- Para UPDATE, verificar si solo cambió el vehicle_id
    IF TG_OP = 'UPDATE' THEN
      v_only_vehicle_id_changed := (
        -- Solo vehicle_id cambió, todos los demás campos financieros permanecen igual
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
        -- Solo vehicle_id puede ser diferente
        OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id
      );
      
      -- Si solo cambió vehicle_id, permitir la actualización
      IF v_only_vehicle_id_changed THEN
        RETURN NEW;
      END IF;
    END IF;
    
    -- Para cualquier otro cambio (INSERT, DELETE, o UPDATE de otros campos), bloquear
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

-- Ahora actualizar las transacciones con los vehículos correspondientes
-- Diosvani (484d83b3-b928-46b3-9705-db225ddb9b0c) → vehículo 4812 (9a3a0661-25c0-43e6-929b-f7d4e911fdd9)
UPDATE fuel_expenses
SET vehicle_id = '9a3a0661-25c0-43e6-929b-f7d4e911fdd9'
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c';

-- Hector (087a825c-94ea-42d9-8388-5087a19d776f) → vehículo 1890 (774a7b75-d70c-4f6f-b17c-040519fb986e)
UPDATE fuel_expenses
SET vehicle_id = '774a7b75-d70c-4f6f-b17c-040519fb986e'
WHERE driver_user_id = '087a825c-94ea-42d9-8388-5087a19d776f';
