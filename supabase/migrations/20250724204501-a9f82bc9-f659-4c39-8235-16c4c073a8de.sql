-- Función principal que orquesta el cálculo completo de un período
CREATE OR REPLACE FUNCTION public.process_company_payment_period(
  company_payment_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_record RECORD;
  driver_record RECORD;
  calc_id UUID;
  recurring_result JSONB;
  calc_result JSONB;
  total_drivers INTEGER := 0;
  processed_drivers INTEGER := 0;
  total_expenses_generated INTEGER := 0;
  drivers_with_negative INTEGER := 0;
  summary JSONB;
BEGIN
  -- Verificar que el período existe y está abierto
  SELECT * INTO period_record 
  FROM public.company_payment_periods 
  WHERE id = company_payment_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  IF period_record.status NOT IN ('open', 'processing') THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período debe estar abierto para procesarlo');
  END IF;
  
  -- Marcar el período como "en procesamiento"
  UPDATE public.company_payment_periods 
  SET status = 'processing', updated_at = now()
  WHERE id = company_payment_period_id;
  
  -- PASO 1: Generar gastos recurrentes para el período
  SELECT public.generate_recurring_expenses_for_period(company_payment_period_id) 
  INTO recurring_result;
  
  IF NOT (recurring_result->>'success')::BOOLEAN THEN
    RETURN recurring_result;
  END IF;
  
  total_expenses_generated := (recurring_result->>'instances_created')::INTEGER;
  
  -- PASO 2: Procesar cada conductor
  FOR driver_record IN 
    SELECT ucr.user_id
    FROM public.user_company_roles ucr
    WHERE ucr.company_id = period_record.company_id 
    AND ucr.role = 'driver' 
    AND ucr.is_active = true
  LOOP
    total_drivers := total_drivers + 1;
    
    -- Obtener o crear el cálculo del conductor
    SELECT id INTO calc_id
    FROM public.driver_period_calculations
    WHERE company_payment_period_id = company_payment_period_id
    AND driver_user_id = driver_record.user_id;
    
    IF calc_id IS NULL THEN
      INSERT INTO public.driver_period_calculations (
        company_payment_period_id,
        driver_user_id,
        gross_earnings,
        total_deductions,
        other_income,
        total_income,
        net_payment,
        has_negative_balance
      ) VALUES (
        company_payment_period_id,
        driver_record.user_id,
        0, 0, 0, 0, 0, false
      ) RETURNING id INTO calc_id;
    END IF;
    
    -- PASO 3: Calcular el período del conductor
    SELECT public.calculate_driver_payment_period(calc_id) INTO calc_result;
    
    IF (calc_result->>'success')::BOOLEAN THEN
      processed_drivers := processed_drivers + 1;
      
      IF (calc_result->>'has_negative_balance')::BOOLEAN THEN
        drivers_with_negative := drivers_with_negative + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- PASO 4: Actualizar estado del período
  UPDATE public.company_payment_periods 
  SET 
    status = CASE 
      WHEN drivers_with_negative > 0 THEN 'needs_review'
      ELSE 'calculated'
    END,
    updated_at = now()
  WHERE id = company_payment_period_id;
  
  -- PASO 5: Generar resumen
  SELECT jsonb_build_object(
    'success', true,
    'company_payment_period_id', company_payment_period_id,
    'period_start', period_record.period_start_date,
    'period_end', period_record.period_end_date,
    'period_frequency', period_record.period_frequency,
    'total_drivers', total_drivers,
    'processed_drivers', processed_drivers,
    'drivers_with_negative_balance', drivers_with_negative,
    'recurring_expenses_generated', total_expenses_generated,
    'status', CASE 
      WHEN drivers_with_negative > 0 THEN 'needs_review'
      ELSE 'calculated'
    END,
    'requires_attention', drivers_with_negative > 0,
    'processed_at', now()
  ) INTO summary;
  
  RETURN summary;
END;
$$;