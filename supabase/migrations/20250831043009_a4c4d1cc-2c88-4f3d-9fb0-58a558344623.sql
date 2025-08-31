-- Corregir update_payment_period_on_date_change para usar sistema on-demand

CREATE OR REPLACE FUNCTION public.update_payment_period_on_date_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  company_id_found UUID;
  should_recalculate BOOLEAN := false;
BEGIN
  -- Obtener la empresa y criterio de asignación
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
  WHERE ucr.user_id = COALESCE(NEW.driver_user_id, NEW.created_by)
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Solo procesar si hay cambios en fechas relevantes
  IF (OLD.pickup_date IS DISTINCT FROM NEW.pickup_date) OR 
     (OLD.delivery_date IS DISTINCT FROM NEW.delivery_date) OR
     (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id) THEN
    
    IF company_id_found IS NOT NULL THEN
      -- Determinar fecha objetivo según criterio de la empresa
      IF assignment_criteria = 'delivery_date' THEN
        target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
      ELSE -- pickup_date (default)
        target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
      END IF;
      
      -- ✅ USAR SISTEMA ON-DEMAND
      calculated_period_id := public.create_payment_period_if_needed(
        company_id_found,
        target_date,
        COALESCE(NEW.driver_user_id, NEW.created_by)
      );
      
      -- Actualizar solo si el período cambió
      IF calculated_period_id IS DISTINCT FROM OLD.payment_period_id THEN
        NEW.payment_period_id := calculated_period_id;
        should_recalculate := true;
      END IF;
    END IF;
  END IF;
  
  -- Marcar para recálculo si es necesario
  IF should_recalculate THEN
    -- El recálculo se manejará por otros triggers
    NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;