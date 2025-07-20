-- Agregar configuración para criterio de asignación de cargas a períodos de pago
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS load_assignment_criteria TEXT DEFAULT 'delivery_date' 
CHECK (load_assignment_criteria IN ('pickup_date', 'delivery_date'));

-- Crear comentario para documentar la columna
COMMENT ON COLUMN public.companies.load_assignment_criteria IS 'Criterio para asignar cargas a períodos de pago: pickup_date o delivery_date';

-- Actualizar función assign_payment_period_to_load para usar el criterio configurado
CREATE OR REPLACE FUNCTION public.assign_payment_period_to_load()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  company_id_found UUID;
BEGIN
  -- Obtener la empresa y criterio de asignación del conductor
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
  WHERE ucr.user_id = NEW.driver_user_id 
  AND ucr.role = 'driver' 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Determinar la fecha objetivo según el criterio configurado
  IF assignment_criteria = 'delivery_date' THEN
    target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
  ELSE -- pickup_date
    target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
  END IF;
  
  -- Obtener el período de pago apropiado
  SELECT public.get_current_payment_period(NEW.driver_user_id, target_date) 
  INTO calculated_period_id;
  
  -- Asignar el período a la carga
  NEW.payment_period_id := calculated_period_id;
  
  RETURN NEW;
END;
$$;

-- Actualizar función update_payment_period_on_date_change para usar el criterio configurado
CREATE OR REPLACE FUNCTION public.update_payment_period_on_date_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  company_id_found UUID;
  should_recalculate BOOLEAN := false;
BEGIN
  -- Obtener la empresa y criterio de asignación del conductor
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
  WHERE ucr.user_id = NEW.driver_user_id 
  AND ucr.role = 'driver' 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Determinar si necesitamos recalcular según el criterio
  IF assignment_criteria = 'delivery_date' THEN
    should_recalculate := (OLD.delivery_date IS DISTINCT FROM NEW.delivery_date) OR 
                         (OLD.pickup_date IS DISTINCT FROM NEW.pickup_date) OR 
                         (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id);
    target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
  ELSE -- pickup_date
    should_recalculate := (OLD.pickup_date IS DISTINCT FROM NEW.pickup_date) OR 
                         (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id);
    target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
  END IF;
  
  -- Solo recalcular si es necesario
  IF should_recalculate THEN
    SELECT public.get_current_payment_period(NEW.driver_user_id, target_date) 
    INTO calculated_period_id;
    
    NEW.payment_period_id := calculated_period_id;
  END IF;
  
  RETURN NEW;
END;
$$;