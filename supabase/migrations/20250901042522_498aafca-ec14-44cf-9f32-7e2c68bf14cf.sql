-- 🚨 SOLUCIÓN CORRECTA: Períodos SOLO cuando hay transacciones reales
-- Eliminar validaciones temporales innecesarias y enfocar en lógica de negocio

-- 1. Restaurar create_payment_period_if_needed sin límites artificiales
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
  period_start_date DATE;
  period_end_date DATE;
  days_diff INTEGER;
BEGIN
  -- Log de la solicitud
  RAISE LOG 'create_payment_period_if_needed: company=%, date=%, user=%', 
    target_company_id, target_date, created_by_user_id;
  
  -- Buscar período existente que contenga la fecha
  SELECT id INTO existing_period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date <= target_date
    AND period_end_date >= target_date
    AND status IN ('open', 'processing')
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
    period_start_date := target_date - (days_diff || ' days')::INTERVAL;
    period_end_date := period_start_date + INTERVAL '6 days';
  ELSIF company_record.default_payment_frequency = 'biweekly' THEN
    days_diff := (target_date - 
      DATE(EXTRACT(YEAR FROM target_date) || '-01-' || 
      LPAD(company_record.payment_cycle_start_day::text, 2, '0')))::INTEGER % 14;
    period_start_date := target_date - (days_diff || ' days')::INTERVAL;
    period_end_date := period_start_date + INTERVAL '13 days';
  ELSE -- monthly
    period_start_date := DATE_TRUNC('month', target_date)::DATE;
    period_end_date := (DATE_TRUNC('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
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
    period_start_date,
    period_end_date,
    company_record.default_payment_frequency,
    'open',
    'regular'
  ) RETURNING id INTO new_period_id;

  RAISE LOG 'create_payment_period_if_needed: Created new period % (%-%) for company % - TRIGGERED BY REAL TRANSACTION', 
    new_period_id, period_start_date, period_end_date, target_company_id;

  RETURN new_period_id;
END;
$$;

-- 2. Eliminar trigger preventivo innecesario (ya no es el problema)
DROP TRIGGER IF EXISTS prevent_future_periods_trigger ON company_payment_periods;
DROP FUNCTION IF EXISTS public.prevent_future_period_creation();

-- 3. Comentar la función de limpieza de emergencia (ya no necesaria)
DROP FUNCTION IF EXISTS public.emergency_cleanup_week36_period();

COMMENT ON FUNCTION public.create_payment_period_if_needed IS 
'Crea períodos de pago SOLO cuando hay transacciones reales que lo requieren.
NUNCA debe llamarse sin una transacción específica (load, fuel_expense, deduction, other_income).
Enfoque: Períodos bajo demanda, no automáticos.';