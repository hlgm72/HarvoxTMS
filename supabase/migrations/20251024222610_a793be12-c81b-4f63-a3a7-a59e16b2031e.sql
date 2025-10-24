
-- Reemplazar el trigger para usar la función correcta que actualiza user_payrolls

DROP TRIGGER IF EXISTS trigger_recalc_on_load_change ON loads;

CREATE OR REPLACE FUNCTION trigger_recalculate_user_payroll_on_load_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_old_driver_id UUID;
  v_old_period_id UUID;
BEGIN
  -- Para INSERT y UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
    
    -- Para UPDATE, también recalcular el período/driver anterior si cambió
    IF TG_OP = 'UPDATE' THEN
      v_old_driver_id := OLD.driver_user_id;
      v_old_period_id := OLD.payment_period_id;
      
      -- Si cambió driver o período, recalcular el anterior
      IF v_old_driver_id IS DISTINCT FROM NEW.driver_user_id OR 
         v_old_period_id IS DISTINCT FROM NEW.payment_period_id THEN
        IF v_old_driver_id IS NOT NULL AND v_old_period_id IS NOT NULL THEN
          PERFORM recalculate_user_payroll_complete(v_old_driver_id, v_old_period_id);
        END IF;
      END IF;
    END IF;
    
    -- Recalcular el período/driver actual
    IF v_driver_id IS NOT NULL AND v_period_id IS NOT NULL THEN
      PERFORM recalculate_user_payroll_complete(v_driver_id, v_period_id);
    END IF;
    
    RETURN NEW;
  END IF;

  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
    
    IF v_driver_id IS NOT NULL AND v_period_id IS NOT NULL THEN
      PERFORM recalculate_user_payroll_complete(v_driver_id, v_period_id);
    END IF;
    
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Crear el trigger actualizado
CREATE TRIGGER trigger_recalc_on_load_change
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_user_payroll_on_load_change();
