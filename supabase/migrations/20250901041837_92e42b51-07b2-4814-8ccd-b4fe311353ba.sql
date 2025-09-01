-- 🚨 SOLUCIÓN DEFINITIVA: Bloquear creación masiva de períodos
-- Modificar el trigger preventivo para ser más restrictivo

-- 1. Actualizar la función de prevención con límites más estrictos
CREATE OR REPLACE FUNCTION public.prevent_future_period_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_future_date DATE := CURRENT_DATE + INTERVAL '3 days'; -- Solo 3 días en el futuro
  current_week INTEGER;
  period_week INTEGER;
BEGIN
  -- Calcular semanas para validación adicional
  current_week := EXTRACT(week FROM CURRENT_DATE);
  period_week := EXTRACT(week FROM NEW.period_start_date);
  
  -- REGLA 1: No períodos más de 3 días en el futuro
  IF NEW.period_start_date > max_future_date THEN
    RAISE EXCEPTION 'ERROR_PERIOD_TOO_FAR_FUTURE: No se pueden crear períodos que inicien después del % (máximo 3 días)', max_future_date;
  END IF;
  
  -- REGLA 2: Bloquear específicamente semana 36 en el año actual
  IF EXTRACT(year FROM NEW.period_start_date) = EXTRACT(year FROM CURRENT_DATE) 
     AND period_week = 36 
     AND current_week < 35 THEN
    RAISE EXCEPTION 'ERROR_WEEK_36_BLOCKED: Creación de período semana 36 bloqueada - es demasiado futuro';
  END IF;
  
  -- REGLA 3: No crear períodos de semanas futuras si estamos en semanas anteriores
  IF period_week > current_week + 1 AND EXTRACT(year FROM NEW.period_start_date) = EXTRACT(year FROM CURRENT_DATE) THEN
    RAISE EXCEPTION 'ERROR_FUTURE_WEEK_BLOCKED: No se pueden crear períodos de semana % cuando estamos en semana %', period_week, current_week;
  END IF;

  -- Log para auditoria
  RAISE LOG 'prevent_future_period_creation: Period % validated for dates %-% (week %, current week %, within limit: %)', 
    NEW.id, NEW.period_start_date, NEW.period_end_date, period_week, current_week, max_future_date;

  RETURN NEW;
END;
$$;

-- 2. Eliminar el período problemático existente (solo si no tiene datos)
DO $$
DECLARE
  problematic_period_id UUID := '92b2e04b-e4a5-4193-9197-88538055a43a';
  has_data INTEGER := 0;
BEGIN
  -- Verificar si tiene datos asociados
  SELECT 
    (SELECT COUNT(*) FROM loads WHERE payment_period_id = problematic_period_id) +
    (SELECT COUNT(*) FROM fuel_expenses WHERE payment_period_id = problematic_period_id) +
    (SELECT COUNT(*) FROM driver_period_calculations WHERE company_payment_period_id = problematic_period_id)
  INTO has_data;
  
  -- Solo eliminar si no tiene datos
  IF has_data = 0 THEN
    DELETE FROM company_payment_periods 
    WHERE id = problematic_period_id 
    AND period_start_date = '2025-09-01';
    
    RAISE LOG 'CLEANUP: Eliminated empty problematic period %', problematic_period_id;
  ELSE
    RAISE LOG 'CLEANUP: Period % has % associated records, cannot delete', problematic_period_id, has_data;
  END IF;
END $$;

-- 3. Fortalecer la función create_payment_period_if_needed para prevenir futuros
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
  max_future_date DATE := CURRENT_DATE + INTERVAL '3 days';
  current_week INTEGER := EXTRACT(week FROM CURRENT_DATE);
  target_week INTEGER := EXTRACT(week FROM target_date);
BEGIN
  -- Log inicial
  RAISE LOG 'create_payment_period_if_needed: company=%, date=%, user=%, week=%', 
    target_company_id, target_date, created_by_user_id, target_week;
  
  -- VALIDACIÓN CRÍTICA: No crear períodos demasiado futuros
  IF target_date > max_future_date THEN
    RAISE EXCEPTION 'ERROR_DATE_TOO_FUTURE: No se pueden crear períodos para fecha % (máximo permitido: %)', target_date, max_future_date;
  END IF;
  
  -- VALIDACIÓN CRÍTICA: Bloquear semana 36 específicamente
  IF target_week = 36 AND current_week < 35 AND EXTRACT(year FROM target_date) = EXTRACT(year FROM CURRENT_DATE) THEN
    RAISE EXCEPTION 'ERROR_WEEK_36_BLOCKED: Creación de período semana 36 bloqueada - es demasiado futuro';
  END IF;

  -- Buscar período existente
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

  -- Calcular límites del período
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

  -- VALIDACIÓN FINAL: Verificar que el período calculado no sea demasiado futuro
  IF period_start_date > max_future_date THEN
    RAISE EXCEPTION 'ERROR_CALCULATED_PERIOD_TOO_FUTURE: El período calculado (%) excede el límite futuro (%)', period_start_date, max_future_date;
  END IF;

  -- Crear el nuevo período
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

  RAISE LOG 'create_payment_period_if_needed: Created new period % (%-%) for company %, week %', 
    new_period_id, period_start_date, period_end_date, target_company_id, EXTRACT(week FROM period_start_date);

  RETURN new_period_id;
END;
$$;