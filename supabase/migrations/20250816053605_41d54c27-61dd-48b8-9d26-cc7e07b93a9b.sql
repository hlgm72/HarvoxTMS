-- Agregar columna payment_date a company_payment_periods
ALTER TABLE company_payment_periods 
ADD COLUMN payment_date DATE;

-- Función auxiliar para calcular el payment_date basado en payment_day
CREATE OR REPLACE FUNCTION calculate_payment_date(
  period_end_date DATE,
  payment_day TEXT
) RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  target_day_num INTEGER;
  period_end_day_num INTEGER;
  days_to_add INTEGER;
  result_date DATE;
BEGIN
  -- Convertir payment_day a número (1=Monday, 7=Sunday)
  CASE LOWER(payment_day)
    WHEN 'monday' THEN target_day_num := 1;
    WHEN 'tuesday' THEN target_day_num := 2;
    WHEN 'wednesday' THEN target_day_num := 3;
    WHEN 'thursday' THEN target_day_num := 4;
    WHEN 'friday' THEN target_day_num := 5;
    WHEN 'saturday' THEN target_day_num := 6;
    WHEN 'sunday' THEN target_day_num := 7;
    ELSE target_day_num := 5; -- Default: Friday
  END CASE;
  
  -- Obtener día de la semana del period_end_date (1=Monday, 7=Sunday)
  period_end_day_num := EXTRACT(isodow FROM period_end_date);
  
  -- Calcular días a agregar para llegar al próximo payment_day
  days_to_add := (target_day_num - period_end_day_num + 7) % 7;
  
  -- Si el payment_day es el mismo día que period_end_date, usar la semana siguiente
  IF days_to_add = 0 THEN
    days_to_add := 7;
  END IF;
  
  result_date := period_end_date + days_to_add;
  
  RETURN result_date;
END;
$$;

-- Actualizar función generate_company_payment_periods para incluir payment_date
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
  calculated_payment_date DATE;
  periods_created INTEGER := 0;
  frequency_days INTEGER;
  start_day_of_week INTEGER;
  days_to_add INTEGER;
BEGIN
  -- Obtener configuración de la empresa
  SELECT 
    default_payment_frequency,
    COALESCE(payment_cycle_start_day, 1) as payment_cycle_start_day,
    COALESCE(payment_day, 'friday') as payment_day
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
    
    -- Calcular payment_date usando la función auxiliar
    calculated_payment_date := calculate_payment_date(current_period_end, company_settings.payment_day);
    
    -- Verificar si ya existe el período
    IF NOT EXISTS (
      SELECT 1 FROM public.company_payment_periods 
      WHERE company_id = company_id_param 
      AND period_start_date = current_period_start
      AND period_end_date = current_period_end
    ) THEN
      -- Crear el período con payment_date calculado
      INSERT INTO public.company_payment_periods (
        company_id,
        period_start_date,
        period_end_date,
        period_frequency,
        period_type,
        status,
        payment_date
      ) VALUES (
        company_id_param,
        current_period_start,
        current_period_end,
        company_settings.default_payment_frequency,
        'regular',
        'open',
        calculated_payment_date
      );
      
      periods_created := periods_created + 1;
    ELSE
      -- Si el período existe pero no tiene payment_date, actualizarlo
      UPDATE public.company_payment_periods 
      SET payment_date = calculated_payment_date
      WHERE company_id = company_id_param 
      AND period_start_date = current_period_start
      AND period_end_date = current_period_end
      AND payment_date IS NULL;
    END IF;
    
    current_period_start := current_period_start + frequency_days;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'periods_created', periods_created,
    'message', 'Payment periods generated successfully with payment dates'
  );
END;
$function$;

-- Calcular payment_date para períodos existentes que no lo tengan
UPDATE company_payment_periods 
SET payment_date = calculate_payment_date(
  period_end_date, 
  (SELECT COALESCE(payment_day, 'friday') FROM companies WHERE id = company_payment_periods.company_id)
)
WHERE payment_date IS NULL;