-- Fix the function signature issue in generate_payment_periods
CREATE OR REPLACE FUNCTION public.generate_payment_periods(company_id_param uuid, from_date date, to_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  company_settings RECORD;
  driver_record RECORD;
  current_period_start DATE;
  current_period_end DATE;
  periods_created INTEGER := 0;
  frequency_days INTEGER;
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
  
  -- Obtener todos los conductores activos de la empresa
  FOR driver_record IN 
    SELECT ucr.user_id
    FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param 
    AND ucr.role = 'driver' 
    AND ucr.is_active = true
  LOOP
    current_period_start := from_date;
    
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
    'message', 'Payment periods generated successfully'
  );
END;
$function$;