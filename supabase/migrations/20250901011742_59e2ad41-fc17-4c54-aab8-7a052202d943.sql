-- ============================================================================
-- FUNCIÓN: Actualizar estado de transacciones de combustible cuando conductor es pagado
-- ============================================================================

-- Función para actualizar estado de transacciones de combustible cuando conductor es marcado como pagado
CREATE OR REPLACE FUNCTION update_fuel_expenses_status_on_payment()
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
      driver_user_id = NEW.driver_user_id
      AND payment_period_id = NEW.company_payment_period_id
      AND status = 'pending';  -- Solo actualizar las que están pendientes
    
    -- Log de la actualización automática
    RAISE NOTICE 'Auto-approved fuel expenses for paid driver % in period %', 
      NEW.driver_user_id, NEW.company_payment_period_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para actualizar automáticamente el estado de las transacciones de combustible
DROP TRIGGER IF EXISTS auto_approve_fuel_expenses_on_payment ON driver_period_calculations;

CREATE TRIGGER auto_approve_fuel_expenses_on_payment
  AFTER UPDATE ON driver_period_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_expenses_status_on_payment();

-- Comentario del trigger
COMMENT ON TRIGGER auto_approve_fuel_expenses_on_payment ON driver_period_calculations IS 
  'Actualiza automáticamente el estado de transacciones de combustible de pending a approved cuando un conductor es marcado como pagado';

-- ============================================================================
-- FUNCIÓN: Actualizar retroactivamente transacciones de conductores ya pagados
-- ============================================================================

-- Función para aplicar esta lógica retroactivamente a conductores ya pagados
CREATE OR REPLACE FUNCTION approve_fuel_expenses_for_paid_drivers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count INTEGER := 0;
  row_count_temp INTEGER;
  driver_record RECORD;
BEGIN
  -- Obtener todos los conductores que ya están pagados
  FOR driver_record IN 
    SELECT 
      dpc.driver_user_id,
      dpc.company_payment_period_id,
      cpp.company_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.payment_status = 'paid'
  LOOP
    -- Actualizar transacciones de combustible pendientes para este conductor/período
    UPDATE fuel_expenses 
    SET 
      status = 'approved',
      updated_at = now()
    WHERE 
      driver_user_id = driver_record.driver_user_id
      AND payment_period_id = driver_record.company_payment_period_id
      AND status = 'pending';
    
    -- Obtener el número de filas afectadas y sumarlo al total
    GET DIAGNOSTICS row_count_temp = ROW_COUNT;
    updated_count := updated_count + row_count_temp;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transacciones de combustible actualizadas exitosamente',
    'updated_fuel_expenses', updated_count,
    'processed_at', now()
  );
END;
$$;

-- Ejecutar la función para aplicar cambios retroactivamente
SELECT approve_fuel_expenses_for_paid_drivers();