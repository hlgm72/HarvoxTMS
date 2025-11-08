
-- Fix check_load_period_immutability trigger to remove non-existent driver_earnings field
CREATE OR REPLACE FUNCTION check_load_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_only_payment_status_change BOOLEAN;
BEGIN
  -- Permitir cambios bidireccionales de payment_status sin bloquear otros campos
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
        OLD.total_amount IS NOT DISTINCT FROM NEW.total_amount
      );

  -- Si es un cambio solo de payment_status en la dirección permitida, dejar pasar
  IF v_only_payment_status_change THEN
    RETURN NEW;
  END IF;

  -- Si el período de pago está cerrado (immutable = true), bloquear cambios
  IF EXISTS (
    SELECT 1 
    FROM company_payment_periods 
    WHERE id = OLD.payment_period_id 
    AND immutable = true
  ) THEN
    RAISE EXCEPTION 'Cannot modify load % because payment period is closed', OLD.load_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
