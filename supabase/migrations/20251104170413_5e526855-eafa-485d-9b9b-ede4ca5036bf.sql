-- Corregir trigger para pasar parámetros correctos
DROP TRIGGER IF EXISTS recalculate_payment_period_on_date_change ON public.loads;
DROP FUNCTION IF EXISTS public.recalculate_load_payment_period();

CREATE OR REPLACE FUNCTION public.recalculate_load_payment_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_relevant_date DATE;
  v_assignment_criteria TEXT;
  v_new_period_id UUID;
  v_company_id UUID;
BEGIN
  -- Solo ejecutar en UPDATE cuando cambien pickup_date o delivery_date
  IF TG_OP = 'UPDATE' AND 
     (OLD.pickup_date IS DISTINCT FROM NEW.pickup_date OR 
      OLD.delivery_date IS DISTINCT FROM NEW.delivery_date) THEN
    
    -- Obtener driver_id de la carga
    v_driver_id := NEW.driver_user_id;
    
    -- Si no hay conductor asignado, no hacer nada
    IF v_driver_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener company_id del conductor
    SELECT company_id INTO v_company_id
    FROM user_company_roles
    WHERE user_id = v_driver_id
      AND is_active = true
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
      RAISE WARNING 'No se encontró company_id para el conductor %', v_driver_id;
      RETURN NEW;
    END IF;
    
    -- Obtener el criterio de asignación de la compañía
    SELECT load_assignment_criteria INTO v_assignment_criteria
    FROM companies
    WHERE id = v_company_id;
    
    -- Determinar la fecha relevante según el criterio
    IF v_assignment_criteria = 'pickup_date' THEN
      v_relevant_date := NEW.pickup_date;
    ELSE
      v_relevant_date := NEW.delivery_date;
    END IF;
    
    -- Si hay una fecha relevante, recalcular el período
    IF v_relevant_date IS NOT NULL THEN
      -- Llamar a la función que crea/obtiene el período correcto
      -- Parámetros: (company_id, date, created_by_user_id)
      v_new_period_id := create_payment_period_if_needed(
        v_company_id,
        v_relevant_date,
        v_driver_id  -- usar driver_id como created_by
      );
      
      -- Actualizar el payment_period_id de la carga
      NEW.payment_period_id := v_new_period_id;
      
      RAISE NOTICE 'Recalculado payment_period_id para carga % de % a %', 
        NEW.load_number, OLD.payment_period_id, v_new_period_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER recalculate_payment_period_on_date_change
  BEFORE UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_load_payment_period();