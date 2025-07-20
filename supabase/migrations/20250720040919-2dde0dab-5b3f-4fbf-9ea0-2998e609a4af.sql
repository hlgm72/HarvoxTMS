-- Corregir función generate_payment_periods para calcular correctamente períodos basados en payment_cycle_start_day
-- y eliminar períodos mal calculados

-- 1. Primero eliminar períodos incorrectos existentes (que no comienzan en lunes)
-- Solo para la empresa con problemas - identificaremos por driver_user_id
DELETE FROM public.payment_periods 
WHERE driver_user_id = '087a825c-94ea-42d9-8388-5087a19d776f'
AND EXTRACT(DOW FROM period_start_date) != 1; -- No es lunes

-- 2. Crear función corregida generate_payment_periods
CREATE OR REPLACE FUNCTION public.generate_payment_periods(company_id_param uuid, from_date date, to_date date)
RETURNS jsonb
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

-- 3. Regenerar períodos correctos para el conductor afectado
-- Obtener el ID de la empresa del conductor
DO $$
DECLARE
  target_company_id UUID;
BEGIN
  SELECT ucr.company_id INTO target_company_id
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = '087a825c-94ea-42d9-8388-5087a19d776f'
  AND ucr.role = 'driver'
  AND ucr.is_active = true
  LIMIT 1;
  
  IF target_company_id IS NOT NULL THEN
    -- Regenerar períodos desde julio hasta agosto
    PERFORM public.generate_payment_periods(
      target_company_id,
      '2025-07-01'::date,
      '2025-08-31'::date
    );
  END IF;
END $$;