-- Corregir el trigger assign_payment_period_to_load para usar sistema on-demand

CREATE OR REPLACE FUNCTION public.assign_payment_period_to_load()
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
  driver_user_id_to_use UUID;
BEGIN
  -- Solo procesar si no hay período asignado
  IF NEW.payment_period_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Use the assigned driver or the user creating the load
  driver_user_id_to_use := COALESCE(NEW.driver_user_id, NEW.created_by);
  
  -- Get company and assignment criteria
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
  WHERE ucr.user_id = driver_user_id_to_use 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- If we found a company, assign the period
  IF company_id_found IS NOT NULL THEN
    -- Determine target date based on criteria
    IF assignment_criteria = 'delivery_date' THEN
      target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
    ELSE -- pickup_date (default)
      target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
    END IF;
    
    -- ✅ USAR SISTEMA ON-DEMAND en lugar de generación masiva
    calculated_period_id := public.create_payment_period_if_needed(
      company_id_found,
      target_date,
      driver_user_id_to_use
    );
    
    -- Assign the period to the load
    NEW.payment_period_id := calculated_period_id;
  END IF;
  
  RETURN NEW;
END;
$function$;