-- Restaurar funcionalidad perdida de triggers para fechas y períodos de pago

-- 1. Función para actualizar fechas de pickup/delivery desde load_stops
CREATE OR REPLACE FUNCTION public.update_load_dates_from_stops()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculated_pickup_date DATE;
  calculated_delivery_date DATE;
  target_load_id UUID;
BEGIN
  -- Determinar el load_id según la operación
  target_load_id := COALESCE(NEW.load_id, OLD.load_id);
  
  -- Calcular pickup_date (primera parada con fecha)
  SELECT scheduled_date INTO calculated_pickup_date
  FROM public.load_stops 
  WHERE load_id = target_load_id 
  AND stop_type = 'pickup'
  AND scheduled_date IS NOT NULL
  ORDER BY stop_number ASC
  LIMIT 1;
  
  -- Calcular delivery_date (última parada con fecha)
  SELECT scheduled_date INTO calculated_delivery_date
  FROM public.load_stops 
  WHERE load_id = target_load_id 
  AND stop_type = 'delivery'
  AND scheduled_date IS NOT NULL
  ORDER BY stop_number DESC
  LIMIT 1;
  
  -- Actualizar la carga con las fechas calculadas
  UPDATE public.loads 
  SET 
    pickup_date = calculated_pickup_date,
    delivery_date = calculated_delivery_date,
    updated_at = now()
  WHERE id = target_load_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Trigger para actualizar fechas cuando cambian los stops
DROP TRIGGER IF EXISTS trigger_update_load_dates_from_stops ON public.load_stops;
CREATE TRIGGER trigger_update_load_dates_from_stops
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_dates_from_stops();

-- 3. Función para asignar período de pago cuando cambian las fechas
CREATE OR REPLACE FUNCTION public.assign_payment_period_on_date_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        
        -- Buscar período existente
        SELECT cpp.id INTO calculated_period_id
        FROM public.company_payment_periods cpp
        WHERE cpp.company_id = user_company_id
        AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
        AND cpp.status IN ('open', 'processing')
        LIMIT 1;
        
        -- Si no existe, generar períodos
        IF calculated_period_id IS NULL THEN
          PERFORM public.generate_payment_periods(
            user_company_id,
            target_date - INTERVAL '7 days',
            target_date + INTERVAL '30 days'
          );
          
          -- Intentar encontrar el período nuevamente
          SELECT cpp.id INTO calculated_period_id
          FROM public.company_payment_periods cpp
          WHERE cpp.company_id = user_company_id
          AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
          AND cpp.status IN ('open', 'processing')
          LIMIT 1;
        END IF;
        
        -- Asignar el período
        NEW.payment_period_id := calculated_period_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Trigger para asignar período cuando cambian fechas en loads
DROP TRIGGER IF EXISTS trigger_assign_payment_period_on_date_change ON public.loads;
CREATE TRIGGER trigger_assign_payment_period_on_date_change
  BEFORE UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_payment_period_on_date_change();

-- 5. Actualizar cargas existentes que no tienen fechas calculadas
UPDATE public.loads 
SET pickup_date = (
  SELECT scheduled_date 
  FROM public.load_stops 
  WHERE load_id = loads.id 
  AND stop_type = 'pickup'
  AND scheduled_date IS NOT NULL
  ORDER BY stop_number ASC
  LIMIT 1
),
delivery_date = (
  SELECT scheduled_date 
  FROM public.load_stops 
  WHERE load_id = loads.id 
  AND stop_type = 'delivery'
  AND scheduled_date IS NOT NULL
  ORDER BY stop_number DESC
  LIMIT 1
),
updated_at = now()
WHERE pickup_date IS NULL OR delivery_date IS NULL;