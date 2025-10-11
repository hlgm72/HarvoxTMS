-- Actualizar trigger para gestionar status automáticamente
CREATE OR REPLACE FUNCTION public.handle_load_driver_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      
      -- Cambiar status a 'created' si estaba en 'assigned'
      IF NEW.status = 'assigned' THEN
        NEW.status := 'created';
      END IF;
      
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
      
      -- Cambiar status a 'assigned' si estaba en 'created'
      IF NEW.status = 'created' THEN
        NEW.status := 'assigned';
      END IF;
      
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
$function$;