
-- Corregir create_company_payment_period_if_needed para usar cálculo ISO 8601 de semanas
-- Problema: date_trunc('week') usa domingo como primer día, pero el frontend usa ISO 8601 (lunes)
-- Esto causa números de semana inconsistentes entre backend y frontend

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
  iso_day_of_week INTEGER;
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
      -- ✅ CORRECCIÓN: Usar ISO 8601 (lunes como primer día de la semana)
      -- ISODOW devuelve 1=Lunes, 2=Martes, ..., 7=Domingo
      iso_day_of_week := EXTRACT(ISODOW FROM target_date)::INTEGER;
      -- Restar días para llegar al lunes de la semana
      calculated_start_date := target_date - ((iso_day_of_week - 1) || ' days')::INTERVAL;
      calculated_end_date := calculated_start_date + 6;
      
    WHEN 'biweekly' THEN
      DECLARE
        year_start DATE := date_trunc('year', target_date)::DATE;
        -- Ajustar year_start al primer lunes del año
        year_start_iso_dow INTEGER := EXTRACT(ISODOW FROM year_start)::INTEGER;
        first_monday DATE;
        days_since_first_monday INTEGER;
        period_number INTEGER;
      BEGIN
        -- Calcular el primer lunes del año
        IF year_start_iso_dow = 1 THEN
          first_monday := year_start;
        ELSE
          first_monday := year_start + ((8 - year_start_iso_dow) || ' days')::INTERVAL;
        END IF;
        
        -- Calcular cuántos días han pasado desde el primer lunes
        days_since_first_monday := target_date - first_monday;
        -- Calcular el número de período (cada período es de 14 días)
        period_number := days_since_first_monday / 14;
        
        calculated_start_date := first_monday + (period_number * 14);
        calculated_end_date := calculated_start_date + 13;
      END;
      
    WHEN 'monthly' THEN
      calculated_start_date := date_trunc('month', target_date)::DATE;
      calculated_end_date := (date_trunc('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
      
    ELSE
      -- Default a semanal con ISO 8601
      iso_day_of_week := EXTRACT(ISODOW FROM target_date)::INTEGER;
      calculated_start_date := target_date - ((iso_day_of_week - 1) || ' days')::INTERVAL;
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
