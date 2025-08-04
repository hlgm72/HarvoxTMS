-- Verificar si fuel_expenses tiene constraint NOT NULL en payment_period_id
ALTER TABLE fuel_expenses ALTER COLUMN payment_period_id DROP NOT NULL;

-- Eliminar el período actual y el siguiente para la empresa específica
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
-- Primero eliminar las instancias de gastos
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id IN (SELECT id FROM current_and_next_periods)
);

-- Actualizar fuel_expenses para quitar referencias
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
UPDATE fuel_expenses 
SET payment_period_id = NULL 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Actualizar loads para quitar referencias
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
UPDATE loads 
SET payment_period_id = NULL 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Eliminar las calculaciones de conductores
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Finalmente eliminar los períodos
DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND status = 'open'
AND id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
);

-- Corregir la función generate_company_payment_periods para manejar mejor las fechas
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
  base_date DATE;
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
  
  -- Encontrar la fecha base más cercana al from_date que coincida con el día configurado
  -- Usar una fecha conocida (2024-01-01 fue lunes) como referencia
  base_date := '2024-01-01'::date + (start_day_of_week - 1);
  
  -- Calcular cuántos períodos completos han pasado desde la fecha base hasta from_date
  current_period_start := base_date + (((from_date - base_date) / frequency_days)::integer * frequency_days);
  
  -- Si el período calculado es posterior a from_date, retroceder un período
  IF current_period_start > from_date THEN
    current_period_start := current_period_start - frequency_days;
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