-- Actualizar función get_current_payment_period para usar company_payment_periods
CREATE OR REPLACE FUNCTION public.get_current_payment_period(
  driver_user_id_param uuid, 
  target_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_id UUID;
  company_settings RECORD;
  company_id_found UUID;
BEGIN
  -- Obtener la empresa del conductor
  SELECT ucr.company_id INTO company_id_found
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = driver_user_id_param 
  AND ucr.role = 'driver' 
  AND ucr.is_active = true
  LIMIT 1;
  
  IF company_id_found IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar período existente en company_payment_periods
  SELECT cpp.id INTO period_id
  FROM public.company_payment_periods cpp
  WHERE cpp.company_id = company_id_found
  AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
  AND cpp.status IN ('open', 'processing')
  LIMIT 1;
  
  -- Si no existe, generar períodos automáticamente
  IF period_id IS NULL THEN
    -- Generar períodos para un rango que incluya la fecha objetivo
    PERFORM public.generate_payment_periods(
      company_id_found,
      target_date - INTERVAL '30 days',
      target_date + INTERVAL '30 days'
    );
    
    -- Intentar encontrar el período nuevamente
    SELECT cpp.id INTO period_id
    FROM public.company_payment_periods cpp
    WHERE cpp.company_id = company_id_found
    AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
    AND cpp.status IN ('open', 'processing')
    LIMIT 1;
  END IF;
  
  RETURN period_id;
END;
$$;

-- Ahora actualizar las cargas para asignar fechas por defecto
UPDATE public.loads 
SET 
  pickup_date = CURRENT_DATE,
  delivery_date = CURRENT_DATE + 1,
  updated_at = now()
WHERE pickup_date IS NULL 
  AND delivery_date IS NULL;