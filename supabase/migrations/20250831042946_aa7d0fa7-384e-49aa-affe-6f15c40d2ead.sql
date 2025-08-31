-- Corregir assign_payment_period_on_date_change para usar sistema on-demand

CREATE OR REPLACE FUNCTION public.assign_payment_period_on_date_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  user_company_id UUID;
  driver_user_id_to_use UUID;
BEGIN
  -- Solo procesar si cambiaron las fechas relevantes o el conductor
  IF (OLD.pickup_date IS DISTINCT FROM NEW.pickup_date) OR 
     (OLD.delivery_date IS DISTINCT FROM NEW.delivery_date) OR 
     (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id) THEN
    
    -- Usar el conductor asignado o el creador
    driver_user_id_to_use := COALESCE(NEW.driver_user_id, NEW.created_by);
    
    IF driver_user_id_to_use IS NOT NULL THEN
      -- Obtener empresa y criterio de asignación
      SELECT ucr.company_id, c.load_assignment_criteria 
      INTO user_company_id, assignment_criteria
      FROM public.user_company_roles ucr
      JOIN public.companies c ON c.id = ucr.company_id
      WHERE ucr.user_id = driver_user_id_to_use 
      AND ucr.is_active = true
      LIMIT 1;
      
      IF user_company_id IS NOT NULL THEN
        -- Determinar fecha objetivo según criterio de la empresa
        IF assignment_criteria = 'delivery_date' THEN
          target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
        ELSE -- pickup_date (default)
          target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
        END IF;
        
        -- ✅ USAR SISTEMA ON-DEMAND
        calculated_period_id := public.create_payment_period_if_needed(
          user_company_id,
          target_date,
          driver_user_id_to_use
        );
        
        -- Asignar el período
        NEW.payment_period_id := calculated_period_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;