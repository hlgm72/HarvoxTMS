-- 🚨 CORRECCIÓN: Ambigüedad en create_payment_period_if_needed
-- Error: column reference "period_start_date" is ambiguous

CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(
  target_company_id UUID,
  target_date DATE,
  created_by_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_period_id UUID;
  new_period_id UUID;
  company_record RECORD;
  calculated_period_start DATE;  -- Renombrado para evitar ambigüedad
  calculated_period_end DATE;    -- Renombrado para evitar ambigüedad
  days_diff INTEGER;
BEGIN
  -- Log de la solicitud
  RAISE LOG 'create_payment_period_if_needed: company=%, date=%, user=%', 
    target_company_id, target_date, created_by_user_id;
  
  -- Buscar período existente que contenga la fecha (con alias explícito)
  SELECT cpp.id INTO existing_period_id
  FROM company_payment_periods cpp
  WHERE cpp.company_id = target_company_id
    AND cpp.period_start_date <= target_date
    AND cpp.period_end_date >= target_date
    AND cpp.status IN ('open', 'processing')
  LIMIT 1;

  IF existing_period_id IS NOT NULL THEN
    RAISE LOG 'create_payment_period_if_needed: Found existing period %', existing_period_id;
    RETURN existing_period_id;
  END IF;

  -- Obtener configuración de la empresa
  SELECT * INTO company_record
  FROM companies
  WHERE id = target_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found: %', target_company_id;
  END IF;

  -- Calcular límites del período según frecuencia de la empresa
  IF company_record.default_payment_frequency = 'weekly' THEN
    days_diff := EXTRACT(DOW FROM target_date)::INTEGER - 1;
    calculated_period_start := target_date - (days_diff || ' days')::INTERVAL;
    calculated_period_end := calculated_period_start + INTERVAL '6 days';
  ELSIF company_record.default_payment_frequency = 'biweekly' THEN
    days_diff := (target_date - 
      DATE(EXTRACT(YEAR FROM target_date) || '-01-' || 
      LPAD(company_record.payment_cycle_start_day::text, 2, '0')))::INTEGER % 14;
    calculated_period_start := target_date - (days_diff || ' days')::INTERVAL;
    calculated_period_end := calculated_period_start + INTERVAL '13 days';
  ELSE -- monthly
    calculated_period_start := DATE_TRUNC('month', target_date)::DATE;
    calculated_period_end := (DATE_TRUNC('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  -- Crear el nuevo período (SOLO cuando se llama con transacción real)
  INSERT INTO company_payment_periods (
    company_id,
    period_start_date,
    period_end_date,
    period_frequency,
    status,
    period_type
  ) VALUES (
    target_company_id,
    calculated_period_start,
    calculated_period_end,
    company_record.default_payment_frequency,
    'open',
    'regular'
  ) RETURNING id INTO new_period_id;

  RAISE LOG 'create_payment_period_if_needed: Created new period % (%-%) for company % - TRIGGERED BY REAL TRANSACTION', 
    new_period_id, calculated_period_start, calculated_period_end, target_company_id;

  RETURN new_period_id;
END;
$$;