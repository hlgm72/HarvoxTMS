-- Continuación: Funciones para el nuevo modelo de períodos por empresa

-- 6. Función para generar períodos de empresa
CREATE OR REPLACE FUNCTION public.generate_company_payment_periods(
  company_id_param UUID, 
  from_date DATE, 
  to_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_settings RECORD;
  current_period_start DATE;
  current_period_end DATE;
  periods_created INTEGER := 0;
  frequency_days INTEGER;
  cycle_start_day INTEGER;
  adjusted_from_date DATE;
BEGIN
  -- Obtener configuración de la empresa
  SELECT 
    default_payment_frequency,
    payment_cycle_start_day
  INTO company_settings
  FROM public.companies 
  WHERE id = company_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Company not found');
  END IF;
  
  -- Determinar días según frecuencia
  CASE company_settings.default_payment_frequency
    WHEN 'weekly' THEN frequency_days := 7;
    WHEN 'biweekly' THEN frequency_days := 14;
    WHEN 'monthly' THEN frequency_days := 30;
    ELSE frequency_days := 7;
  END CASE;
  
  -- Obtener el día de inicio del ciclo (1=Monday, 2=Tuesday, etc.)
  cycle_start_day := COALESCE(company_settings.payment_cycle_start_day, 1);
  
  -- Ajustar from_date al día de inicio del ciclo más cercano anterior o igual
  adjusted_from_date := from_date - INTERVAL '1 day' * (
    CASE 
      WHEN EXTRACT(DOW FROM from_date) >= cycle_start_day THEN 
        EXTRACT(DOW FROM from_date) - cycle_start_day
      ELSE 
        EXTRACT(DOW FROM from_date) + 7 - cycle_start_day
    END
  );
  
  current_period_start := adjusted_from_date;
  
  WHILE current_period_start <= to_date LOOP
    current_period_end := current_period_start + (frequency_days - 1);
    
    -- Verificar si ya existe el período
    IF NOT EXISTS (
      SELECT 1 FROM public.company_payment_periods 
      WHERE company_id = company_id_param 
      AND period_start_date = current_period_start
      AND period_end_date = current_period_end
    ) THEN
      -- Crear el período
      INSERT INTO public.company_payment_periods (
        company_id,
        period_start_date,
        period_end_date,
        period_frequency,
        period_type,
        status
      ) VALUES (
        company_id_param,
        current_period_start,
        current_period_end,
        company_settings.default_payment_frequency,
        'regular',
        'open'
      );
      
      periods_created := periods_created + 1;
    END IF;
    
    current_period_start := current_period_start + frequency_days;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'periods_created', periods_created,
    'message', 'Company payment periods generated successfully'
  );
END;
$$;

-- 7. Función para asignar cargas al período de empresa correcto
CREATE OR REPLACE FUNCTION public.assign_load_to_company_payment_period()
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
$$;

-- 8. Función para manejar cambios en paradas y actualizar el período
CREATE OR REPLACE FUNCTION public.handle_load_stops_company_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Obtener empresa y criterio de asignación del conductor
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
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
$$;