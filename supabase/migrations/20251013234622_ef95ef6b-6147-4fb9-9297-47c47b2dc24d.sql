
-- 🚨 CORRECCIÓN CRÍTICA: Actualizar trigger y función para user_payrolls
-- El trigger estaba usando driver_user_id que no existe en user_payrolls (usa user_id)

-- Actualizar la función para usar user_id en lugar de driver_user_id
CREATE OR REPLACE FUNCTION public.update_fuel_expenses_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Si el conductor cambió de estado no-pagado a pagado
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Actualizar todas las transacciones de combustible de este conductor en este período
    -- de 'pending' a 'approved' ya que implícitamente fueron aprobadas al pagar al conductor
    UPDATE fuel_expenses 
    SET 
      status = 'approved',
      updated_at = now()
    WHERE 
      driver_user_id = NEW.user_id  -- ✅ CORREGIDO: usar NEW.user_id en lugar de NEW.driver_user_id
      AND payment_period_id = NEW.company_payment_period_id
      AND status = 'pending';  -- Solo actualizar las que están pendientes
    
    -- Log de la actualización automática
    RAISE NOTICE 'Auto-approved fuel expenses for paid driver % in period %', 
      NEW.user_id, NEW.company_payment_period_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Eliminar el trigger de la tabla antigua
DROP TRIGGER IF EXISTS auto_approve_fuel_expenses_on_payment ON driver_period_calculations;

-- Crear/recrear el trigger en la tabla correcta (user_payrolls)
DROP TRIGGER IF EXISTS auto_approve_fuel_expenses_on_payment ON user_payrolls;

CREATE TRIGGER auto_approve_fuel_expenses_on_payment
  AFTER UPDATE ON user_payrolls
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_expenses_status_on_payment();

-- Comentario del trigger
COMMENT ON TRIGGER auto_approve_fuel_expenses_on_payment ON user_payrolls IS 
  'Actualiza automáticamente el estado de transacciones de combustible de pending a approved cuando un conductor es marcado como pagado';
