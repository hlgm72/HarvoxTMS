-- Fix the ambiguous company_id reference in the trigger function
CREATE OR REPLACE FUNCTION public.handle_load_stops_company_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pickup_date_calc DATE;
  delivery_date_calc DATE;
  load_record RECORD;
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  company_id_found UUID;
BEGIN
  -- Obtener información de la carga
  SELECT * INTO load_record
  FROM public.loads 
  WHERE id = COALESCE(NEW.load_id, OLD.load_id);
  
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calcular nuevas fechas de pickup y delivery
  SELECT scheduled_date INTO pickup_date_calc
  FROM public.load_stops 
  WHERE load_id = load_record.id 
  AND stop_type = 'pickup'
  ORDER BY stop_number ASC
  LIMIT 1;
  
  SELECT scheduled_date INTO delivery_date_calc
  FROM public.load_stops 
  WHERE load_id = load_record.id 
  AND stop_type = 'delivery'
  ORDER BY stop_number DESC
  LIMIT 1;
  
  -- Obtener empresa y criterio de asignación del conductor (FIXED: explicit table aliases)
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id  -- Explicit: c.id = ucr.company_id
  WHERE ucr.user_id = load_record.driver_user_id 
  AND ucr.role = 'driver' 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Determinar fecha objetivo según criterio
  IF assignment_criteria = 'delivery_date' THEN
    target_date := COALESCE(delivery_date_calc, pickup_date_calc, CURRENT_DATE);
  ELSE -- pickup_date (default)
    target_date := COALESCE(pickup_date_calc, CURRENT_DATE);
  END IF;
  
  -- Obtener el período de empresa apropiado
  SELECT public.get_company_current_payment_period(company_id_found, target_date) 
  INTO calculated_period_id;
  
  -- Actualizar la carga con las nuevas fechas y período
  UPDATE public.loads 
  SET 
    pickup_date = pickup_date_calc,
    delivery_date = delivery_date_calc,
    payment_period_id = calculated_period_id,
    updated_at = now()
  WHERE id = load_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;