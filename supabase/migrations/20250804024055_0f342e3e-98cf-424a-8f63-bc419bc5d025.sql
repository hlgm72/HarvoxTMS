-- Create the missing function generate_company_payment_periods
CREATE OR REPLACE FUNCTION public.generate_company_payment_periods(
  company_id_param uuid,
  from_date date,
  to_date date
)
RETURNS jsonb
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
BEGIN
  -- Obtener configuración de la empresa
  SELECT 
    default_payment_frequency
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
  
  current_period_start := from_date;
  
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
$$;