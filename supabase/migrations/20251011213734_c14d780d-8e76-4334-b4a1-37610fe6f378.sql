-- =====================================================
-- FUNCIÓN AUXILIAR: Verificar si un período está vacío
-- =====================================================
CREATE OR REPLACE FUNCTION is_payment_period_empty(period_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_data BOOLEAN;
BEGIN
  -- Verificar si hay datos asociados al período
  SELECT EXISTS (
    -- Cargas
    SELECT 1 FROM loads WHERE payment_period_id = period_id
    UNION ALL
    -- Gastos de combustible
    SELECT 1 FROM fuel_expenses WHERE payment_period_id = period_id
    UNION ALL
    -- Deducciones (expense_instances)
    SELECT 1 FROM expense_instances WHERE payment_period_id = period_id
    UNION ALL
    -- Otros ingresos
    SELECT 1 FROM other_income WHERE payment_period_id = period_id
  ) INTO has_data;
  
  RETURN NOT has_data;
END;
$$;

-- =====================================================
-- FUNCIÓN AUXILIAR: Obtener fecha relevante de una carga
-- =====================================================
CREATE OR REPLACE FUNCTION get_load_relevant_date(load_id_param UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_criteria TEXT;
  relevant_date DATE;
  company_id_val UUID;
BEGIN
  -- Obtener company_id y criterio de asignación
  SELECT 
    c.load_assignment_criteria,
    ucr.company_id
  INTO company_criteria, company_id_val
  FROM loads l
  JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id AND ucr.is_active = true
  JOIN companies c ON ucr.company_id = c.id
  WHERE l.id = load_id_param
  LIMIT 1;
  
  -- Obtener la fecha según el criterio
  IF company_criteria = 'pickup_date' THEN
    SELECT COALESCE(ls.scheduled_date, ls.pickup_date)
    INTO relevant_date
    FROM load_stops ls
    WHERE ls.load_id = load_id_param AND ls.stop_type = 'pickup'
    ORDER BY ls.stop_number
    LIMIT 1;
  ELSE -- delivery_date
    SELECT COALESCE(ls.scheduled_date, ls.delivery_date)
    INTO relevant_date
    FROM load_stops ls
    WHERE ls.load_id = load_id_param AND ls.stop_type = 'delivery'
    ORDER BY ls.stop_number DESC
    LIMIT 1;
  END IF;
  
  RETURN relevant_date;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION 1: Cambios en driver_user_id (loads)
-- =====================================================
CREATE OR REPLACE FUNCTION handle_load_driver_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_period_id UUID;
  new_period_id UUID;
  relevant_date DATE;
  company_id_val UUID;
  is_empty BOOLEAN;
BEGIN
  -- Solo procesar si cambió el driver_user_id
  IF OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id THEN
    
    -- CASO 1: Se quitó el driver (Driver → NULL)
    IF NEW.driver_user_id IS NULL AND OLD.driver_user_id IS NOT NULL THEN
      old_period_id := OLD.payment_period_id;
      
      -- Quitar la carga del período
      NEW.payment_period_id := NULL;
      
      -- Verificar si el período quedó vacío y eliminarlo
      IF old_period_id IS NOT NULL THEN
        is_empty := is_payment_period_empty(old_period_id);
        IF is_empty THEN
          DELETE FROM user_payment_periods WHERE id = old_period_id;
          RAISE LOG 'handle_load_driver_change: Deleted empty period % after removing driver', old_period_id;
        END IF;
      END IF;
      
      RETURN NEW;
    END IF;
    
    -- CASO 2: Se asignó driver por primera vez (NULL → Driver)
    IF OLD.driver_user_id IS NULL AND NEW.driver_user_id IS NOT NULL THEN
      relevant_date := get_load_relevant_date(NEW.id);
      
      IF relevant_date IS NOT NULL THEN
        -- Obtener company_id
        SELECT company_id INTO company_id_val
        FROM user_company_roles
        WHERE user_id = NEW.driver_user_id AND is_active = true
        LIMIT 1;
        
        -- Crear período si es necesario
        new_period_id := create_payment_period_if_needed(
          company_id_val,
          relevant_date,
          NEW.driver_user_id
        );
        
        NEW.payment_period_id := new_period_id;
        RAISE LOG 'handle_load_driver_change: Assigned load % to period % for new driver %', 
          NEW.id, new_period_id, NEW.driver_user_id;
      END IF;
      
      RETURN NEW;
    END IF;
    
    -- CASO 3: Cambio de driver (Driver A → Driver B)
    IF OLD.driver_user_id IS NOT NULL AND NEW.driver_user_id IS NOT NULL THEN
      old_period_id := OLD.payment_period_id;
      
      -- Verificar si el período antiguo quedó vacío y eliminarlo
      IF old_period_id IS NOT NULL THEN
        is_empty := is_payment_period_empty(old_period_id);
        IF is_empty THEN
          DELETE FROM user_payment_periods WHERE id = old_period_id;
          RAISE LOG 'handle_load_driver_change: Deleted empty period % after driver change', old_period_id;
        END IF;
      END IF;
      
      -- Crear período para el nuevo driver
      relevant_date := get_load_relevant_date(NEW.id);
      
      IF relevant_date IS NOT NULL THEN
        SELECT company_id INTO company_id_val
        FROM user_company_roles
        WHERE user_id = NEW.driver_user_id AND is_active = true
        LIMIT 1;
        
        new_period_id := create_payment_period_if_needed(
          company_id_val,
          relevant_date,
          NEW.driver_user_id
        );
        
        NEW.payment_period_id := new_period_id;
        RAISE LOG 'handle_load_driver_change: Assigned load % to period % for new driver %', 
          NEW.id, new_period_id, NEW.driver_user_id;
      ELSE
        NEW.payment_period_id := NULL;
      END IF;
      
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION 2: Nueva parada (load_stops INSERT)
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_load_stop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  load_record RECORD;
  relevant_date DATE;
  new_period_id UUID;
  company_id_val UUID;
  company_criteria TEXT;
BEGIN
  -- Obtener información de la carga
  SELECT * INTO load_record FROM loads WHERE id = NEW.load_id;
  
  -- Solo procesar si:
  -- 1. La carga tiene driver asignado
  -- 2. La carga NO tiene período asignado aún
  -- 3. La parada tiene fecha
  IF load_record.driver_user_id IS NOT NULL 
     AND load_record.payment_period_id IS NULL THEN
    
    -- Obtener company_id y criterio
    SELECT ucr.company_id, c.load_assignment_criteria
    INTO company_id_val, company_criteria
    FROM user_company_roles ucr
    JOIN companies c ON ucr.company_id = c.id
    WHERE ucr.user_id = load_record.driver_user_id AND ucr.is_active = true
    LIMIT 1;
    
    -- Determinar si esta parada es relevante según el criterio
    IF (company_criteria = 'pickup_date' AND NEW.stop_type = 'pickup') OR
       (company_criteria = 'delivery_date' AND NEW.stop_type = 'delivery') THEN
      
      relevant_date := COALESCE(NEW.scheduled_date, NEW.pickup_date, NEW.delivery_date);
      
      IF relevant_date IS NOT NULL THEN
        -- Crear período si es necesario
        new_period_id := create_payment_period_if_needed(
          company_id_val,
          relevant_date,
          load_record.driver_user_id
        );
        
        -- Asignar la carga al período
        UPDATE loads 
        SET payment_period_id = new_period_id 
        WHERE id = NEW.load_id;
        
        RAISE LOG 'handle_new_load_stop: Assigned load % to period % after stop creation', 
          NEW.load_id, new_period_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION 3: Cambio de fechas (load_stops UPDATE)
-- =====================================================
CREATE OR REPLACE FUNCTION handle_load_stop_date_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  load_record RECORD;
  old_date DATE;
  new_date DATE;
  old_period_id UUID;
  new_period_id UUID;
  company_id_val UUID;
  company_criteria TEXT;
  is_empty BOOLEAN;
BEGIN
  -- Detectar si cambió la fecha
  old_date := COALESCE(OLD.scheduled_date, OLD.pickup_date, OLD.delivery_date);
  new_date := COALESCE(NEW.scheduled_date, NEW.pickup_date, NEW.delivery_date);
  
  IF old_date IS DISTINCT FROM new_date THEN
    -- Obtener información de la carga
    SELECT * INTO load_record FROM loads WHERE id = NEW.load_id;
    
    -- Solo procesar si la carga tiene driver y período asignado
    IF load_record.driver_user_id IS NOT NULL 
       AND load_record.payment_period_id IS NOT NULL THEN
      
      -- Obtener company_id y criterio
      SELECT ucr.company_id, c.load_assignment_criteria
      INTO company_id_val, company_criteria
      FROM user_company_roles ucr
      JOIN companies c ON ucr.company_id = c.id
      WHERE ucr.user_id = load_record.driver_user_id AND ucr.is_active = true
      LIMIT 1;
      
      -- Verificar si esta parada es relevante según el criterio
      IF (company_criteria = 'pickup_date' AND NEW.stop_type = 'pickup') OR
         (company_criteria = 'delivery_date' AND NEW.stop_type = 'delivery') THEN
        
        IF new_date IS NOT NULL THEN
          -- Crear el nuevo período (si no existe)
          new_period_id := create_payment_period_if_needed(
            company_id_val,
            new_date,
            load_record.driver_user_id
          );
          
          -- Si el período cambió
          IF new_period_id IS DISTINCT FROM load_record.payment_period_id THEN
            old_period_id := load_record.payment_period_id;
            
            -- Actualizar la carga al nuevo período
            UPDATE loads 
            SET payment_period_id = new_period_id 
            WHERE id = NEW.load_id;
            
            -- Verificar si el período antiguo quedó vacío y eliminarlo
            IF old_period_id IS NOT NULL THEN
              is_empty := is_payment_period_empty(old_period_id);
              IF is_empty THEN
                DELETE FROM user_payment_periods WHERE id = old_period_id;
                RAISE LOG 'handle_load_stop_date_change: Deleted empty period % after date change', old_period_id;
              END IF;
            END IF;
            
            RAISE LOG 'handle_load_stop_date_change: Moved load % from period % to period % due to date change', 
              NEW.load_id, old_period_id, new_period_id;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- CREAR LOS TRIGGERS
-- =====================================================

-- Trigger 1: Cambios en driver_user_id
DROP TRIGGER IF EXISTS trigger_handle_load_driver_change ON loads;
CREATE TRIGGER trigger_handle_load_driver_change
  BEFORE UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION handle_load_driver_change();

-- Trigger 2: Nueva parada
DROP TRIGGER IF EXISTS trigger_handle_new_load_stop ON load_stops;
CREATE TRIGGER trigger_handle_new_load_stop
  AFTER INSERT ON load_stops
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_load_stop();

-- Trigger 3: Cambio de fechas en parada
DROP TRIGGER IF EXISTS trigger_handle_load_stop_date_change ON load_stops;
CREATE TRIGGER trigger_handle_load_stop_date_change
  AFTER UPDATE ON load_stops
  FOR EACH ROW
  EXECUTE FUNCTION handle_load_stop_date_change();

-- Log de implementación
DO $$
BEGIN
  RAISE LOG '✅ Sistema de triggers de períodos de pago implementado exitosamente';
  RAISE LOG '   - Trigger para cambios de driver en loads';
  RAISE LOG '   - Trigger para nuevas paradas';
  RAISE LOG '   - Trigger para cambios de fechas en paradas';
END $$;