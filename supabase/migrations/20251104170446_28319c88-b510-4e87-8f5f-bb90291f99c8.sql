-- Actualizar create_company_payment_period_if_needed para usar la tabla companies
CREATE OR REPLACE FUNCTION public.create_company_payment_period_if_needed(
  target_company_id UUID,
  target_date DATE,
  created_by_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_period_id UUID;
  new_period_id UUID;
  company_frequency TEXT;
  calculated_start_date DATE;
  calculated_end_date DATE;
BEGIN
  -- Verificar si ya existe un período que incluya la fecha objetivo
  SELECT id INTO existing_period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND target_date BETWEEN period_start_date AND period_end_date
  LIMIT 1;
  
  IF existing_period_id IS NOT NULL THEN
    RETURN existing_period_id;
  END IF;
  
  -- Obtener la frecuencia de pago desde la tabla companies
  SELECT COALESCE(default_payment_frequency, 'weekly') INTO company_frequency
  FROM companies
  WHERE id = target_company_id;
  
  -- Calcular fechas de inicio y fin según la frecuencia
  CASE company_frequency
    WHEN 'weekly' THEN
      -- Calcular semana que comienza el lunes
      calculated_start_date := date_trunc('week', target_date)::DATE;
      calculated_end_date := calculated_start_date + 6;
      
    WHEN 'biweekly' THEN
      DECLARE
        year_start DATE := date_trunc('year', target_date)::DATE;
        period_number INTEGER := (target_date - year_start) / 14;
      BEGIN
        calculated_start_date := year_start + (period_number * 14);
        calculated_end_date := calculated_start_date + 13;
      END;
      
    WHEN 'monthly' THEN
      calculated_start_date := date_trunc('month', target_date)::DATE;
      calculated_end_date := (date_trunc('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
      
    ELSE
      -- Default a semanal
      calculated_start_date := date_trunc('week', target_date)::DATE;
      calculated_end_date := calculated_start_date + 6;
  END CASE;
  
  -- Insertar el nuevo período (o actualizar si ya existe por race condition)
  INSERT INTO company_payment_periods (
    company_id,
    period_start_date,
    period_end_date,
    period_frequency,
    created_by
  )
  VALUES (
    target_company_id,
    calculated_start_date,
    calculated_end_date,
    company_frequency,
    created_by_user_id
  )
  ON CONFLICT (company_id, period_start_date, period_end_date)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO new_period_id;
  
  RETURN new_period_id;
END;
$$;