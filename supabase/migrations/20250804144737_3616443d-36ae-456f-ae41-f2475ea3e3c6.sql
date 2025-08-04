-- Actualizar la función para usar payment_cycle_start_day de la empresa
CREATE OR REPLACE FUNCTION public.generate_company_payment_periods(company_id_param uuid, from_date date, to_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  company_settings RECORD;
  current_period_start DATE;
  current_period_end DATE;
  periods_created INTEGER := 0;
  frequency_days INTEGER;
  start_day_of_week INTEGER;
  days_to_add INTEGER;
BEGIN
  -- Obtener configuración de la empresa
  SELECT 
    default_payment_frequency,
    COALESCE(payment_cycle_start_day, 1) as payment_cycle_start_day
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
  
  -- Obtener el día de la semana configurado (1=Lunes, 2=Martes, ..., 7=Domingo)
  start_day_of_week := company_settings.payment_cycle_start_day;
  
  -- Calcular la fecha de inicio del primer período basado en el día configurado
  -- EXTRACT(dow) devuelve 0=Domingo, 1=Lunes, ..., 6=Sábado
  -- Convertir a formato ISO donde 1=Lunes, 7=Domingo
  days_to_add := (start_day_of_week - 1 - (EXTRACT(dow FROM from_date) + 6) % 7) % 7;
  current_period_start := from_date + days_to_add;
  
  -- Si la fecha calculada es posterior a from_date, retroceder una semana
  IF current_period_start > from_date THEN
    current_period_start := current_period_start - 7;
  END IF;
  
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
    'message', 'Payment periods generated successfully'
  );
END;
$function$;