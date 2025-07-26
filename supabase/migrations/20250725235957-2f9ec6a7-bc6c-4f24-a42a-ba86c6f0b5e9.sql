-- Actualizar funciones de asignación automática de períodos para cargas
-- Ahora que loads apunta directamente a company_payment_periods

-- Crear función optimizada para obtener período de empresa actual
CREATE OR REPLACE FUNCTION public.get_company_current_payment_period(
  company_id_param UUID,
  target_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  period_id UUID;
BEGIN
  SELECT id INTO period_id
  FROM public.company_payment_periods
  WHERE company_id = company_id_param
  AND target_date BETWEEN period_start_date AND period_end_date
  AND status IN ('open', 'processing')
  ORDER BY period_start_date DESC
  LIMIT 1;
  
  RETURN period_id;
END;
$$;

-- Actualizar función para asignación automática de períodos a cargas (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION public.assign_payment_period_to_load()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    
    -- Get the appropriate payment period for the company (SIMPLIFICADO)
    calculated_period_id := public.get_company_current_payment_period(company_id_found, target_date);
    
    -- If no period found, try to generate one
    IF calculated_period_id IS NULL THEN
      PERFORM public.generate_payment_periods(
        company_id_found,
        target_date - INTERVAL '7 days',
        target_date + INTERVAL '30 days'
      );
      
      -- Try to find the period again
      calculated_period_id := public.get_company_current_payment_period(company_id_found, target_date);
    END IF;
    
    -- Assign the period to the load
    NEW.payment_period_id := calculated_period_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Actualizar función para manejar cambios en load_stops (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION public.handle_load_stops_company_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pickup_date_calc DATE;
  delivery_date_calc DATE;
  load_record RECORD;
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  company_id_found UUID;
BEGIN
  -- Get load information
  SELECT * INTO load_record
  FROM public.loads 
  WHERE id = COALESCE(NEW.load_id, OLD.load_id);
  
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calculate new pickup and delivery dates
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
  
  -- Get company and assignment criteria
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
  WHERE ucr.user_id = load_record.driver_user_id 
  AND ucr.role = 'driver' 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Determine target date according to criteria
  IF assignment_criteria = 'delivery_date' THEN
    target_date := COALESCE(delivery_date_calc, pickup_date_calc, CURRENT_DATE);
  ELSE -- pickup_date (default)
    target_date := COALESCE(pickup_date_calc, CURRENT_DATE);
  END IF;
  
  -- Get the appropriate company payment period (SIMPLIFICADO)
  calculated_period_id := public.get_company_current_payment_period(company_id_found, target_date);
  
  -- Update the load with new dates and period
  UPDATE public.loads 
  SET 
    pickup_date = pickup_date_calc,
    delivery_date = delivery_date_calc,
    payment_period_id = calculated_period_id,
    updated_at = now()
  WHERE id = load_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Comentario sobre las optimizaciones
COMMENT ON FUNCTION public.get_company_current_payment_period(UUID, DATE) 
IS 'Función optimizada para obtener el período de pago actual de una empresa para una fecha dada. Simplificada para usar company_payment_periods directamente.';

COMMENT ON FUNCTION public.assign_payment_period_to_load() 
IS 'Trigger optimizado para asignar períodos a cargas. Simplificado para usar company_payment_periods directamente sin driver_period_calculations.';

COMMENT ON FUNCTION public.handle_load_stops_company_assignment() 
IS 'Trigger optimizado para manejar cambios en paradas de cargas. Simplificado para usar company_payment_periods directamente.';