-- Fix the OTHER function that has the same company_id ambiguity issue
CREATE OR REPLACE FUNCTION public.assign_load_to_company_payment_period()
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
BEGIN
  -- Fix the ambiguous company_id reference with explicit table qualification
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id  -- FIXED: explicit table qualification
  WHERE ucr.user_id = NEW.driver_user_id 
  AND ucr.role = 'driver' 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Determinar la fecha objetivo según el criterio configurado
  IF assignment_criteria = 'delivery_date' THEN
    target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
  ELSE -- pickup_date (default)
    target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
  END IF;
  
  -- Obtener el período de empresa apropiado
  SELECT public.get_company_current_payment_period(company_id_found, target_date) 
  INTO calculated_period_id;
  
  -- Asignar el período a la carga
  NEW.payment_period_id := calculated_period_id;
  
  RETURN NEW;
END;
$function$;