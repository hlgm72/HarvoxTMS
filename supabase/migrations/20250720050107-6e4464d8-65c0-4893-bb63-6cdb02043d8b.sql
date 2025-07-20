-- Completar el sistema de asignación automática de períodos de pago

-- 1. Asegurar que existe el trigger para actualizar fechas de cargas desde paradas
DROP TRIGGER IF EXISTS trigger_update_load_dates_from_stops ON public.load_stops;
CREATE TRIGGER trigger_update_load_dates_from_stops
    AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
    FOR EACH ROW
    EXECUTE FUNCTION public.update_load_dates_from_stops();

-- 2. Mejorar la función de generación de períodos para usar el cycle_start_day correctamente
CREATE OR REPLACE FUNCTION public.generate_payment_periods(company_id_param UUID, from_date DATE, to_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_settings RECORD;
  driver_record RECORD;
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
  -- PostgreSQL DOW: 0=Sunday, 1=Monday, 2=Tuesday, etc.
  adjusted_from_date := from_date - INTERVAL '1 day' * (
    CASE 
      WHEN EXTRACT(DOW FROM from_date) >= cycle_start_day THEN 
        EXTRACT(DOW FROM from_date) - cycle_start_day
      ELSE 
        EXTRACT(DOW FROM from_date) + 7 - cycle_start_day
    END
  );
  
  -- Obtener todos los conductores activos de la empresa
  FOR driver_record IN 
    SELECT ucr.user_id
    FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param 
    AND ucr.role = 'driver' 
    AND ucr.is_active = true
  LOOP
    current_period_start := adjusted_from_date;
    
    WHILE current_period_start <= to_date LOOP
      current_period_end := current_period_start + (frequency_days - 1);
      
      -- Verificar si ya existe el período
      IF NOT EXISTS (
        SELECT 1 FROM public.payment_periods 
        WHERE driver_user_id = driver_record.user_id 
        AND period_start_date = current_period_start
        AND period_end_date = current_period_end
      ) THEN
        -- Crear el período
        INSERT INTO public.payment_periods (
          driver_user_id,
          period_start_date,
          period_end_date,
          period_frequency,
          period_type,
          status,
          gross_earnings,
          total_deductions,
          other_income,
          total_income,
          net_payment,
          has_negative_balance
        ) VALUES (
          driver_record.user_id,
          current_period_start,
          current_period_end,
          company_settings.default_payment_frequency,
          'regular',
          'open',
          0,
          0,
          0,
          0,
          0,
          false
        );
        
        periods_created := periods_created + 1;
      END IF;
      
      current_period_start := current_period_start + frequency_days;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'periods_created', periods_created,
    'message', 'Payment periods generated successfully with correct cycle start day'
  );
END;
$$;

-- 3. Crear función para actualizar automáticamente el payment_period_id cuando cambien las fechas de la carga
CREATE OR REPLACE FUNCTION public.update_payment_period_when_dates_change()
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
  ELSE -- pickup_date (default)
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

-- 4. Crear trigger para recalcular el período cuando cambien las fechas de la carga
DROP TRIGGER IF EXISTS trigger_update_payment_period_on_date_change ON public.loads;
CREATE TRIGGER trigger_update_payment_period_on_date_change
    BEFORE UPDATE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_period_when_dates_change();

-- 5. Crear función para manejar el flujo completo al insertar/actualizar paradas
CREATE OR REPLACE FUNCTION public.handle_load_stops_changes()
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
  
  -- Obtener criterio de asignación de la empresa del conductor
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
  
  -- Obtener el período de pago apropiado
  SELECT public.get_current_payment_period(load_record.driver_user_id, target_date) 
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

-- 6. Reemplazar el trigger anterior con la nueva función más completa
DROP TRIGGER IF EXISTS trigger_update_load_dates_from_stops ON public.load_stops;
CREATE TRIGGER trigger_handle_load_stops_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_load_stops_changes();

-- 7. Asegurar que los triggers de asignación de período estén activos
DROP TRIGGER IF EXISTS trigger_assign_payment_period_on_load_insert ON public.loads;
CREATE TRIGGER trigger_assign_payment_period_on_load_insert
    BEFORE INSERT ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_payment_period_to_load();