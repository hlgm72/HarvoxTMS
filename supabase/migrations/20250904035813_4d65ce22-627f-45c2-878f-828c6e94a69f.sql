-- Fix payment_date not being set when creating payment periods
-- Update create_payment_period_if_needed to automatically calculate payment_date

CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(target_company_id uuid, target_date date, created_by_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  company_record RECORD;
  existing_period_id UUID;
  period_start DATE;
  period_end DATE;
  new_period_id UUID;
  driver_record RECORD;
  calculated_payment_date DATE;
BEGIN
  RAISE LOG 'create_payment_period_if_needed: company=%, date=%, user=%', 
    target_company_id, target_date, created_by_user_id;

  -- PASO 1: Obtener configuración de la empresa
  SELECT default_payment_frequency, payment_cycle_start_day, payment_day
  INTO company_record
  FROM companies
  WHERE id = target_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company % not found', target_company_id;
  END IF;

  -- PASO 2: Calcular fechas del período basándose en la frecuencia
  IF company_record.default_payment_frequency = 'weekly' THEN
    -- Calcular inicio de semana (lunes)
    period_start := target_date - (EXTRACT(DOW FROM target_date)::INTEGER - 1);
    period_end := period_start + INTERVAL '6 days';
  ELSIF company_record.default_payment_frequency = 'biweekly' THEN
    -- Calcular períodos de 2 semanas
    period_start := target_date - (EXTRACT(DOW FROM target_date)::INTEGER - 1);
    period_end := period_start + INTERVAL '13 days';
  ELSE -- monthly
    period_start := date_trunc('month', target_date)::DATE;
    period_end := (date_trunc('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  -- PASO 3: Buscar período existente EXACTO (mismas fechas)
  SELECT id INTO existing_period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date = period_start
    AND period_end_date = period_end;

  -- Si existe uno con fechas exactas, devolverlo
  IF existing_period_id IS NOT NULL THEN
    RAISE LOG 'create_payment_period_if_needed: Found existing period with exact dates %', existing_period_id;
    RETURN existing_period_id;
  END IF;

  -- PASO 4: Verificar si existe un período que CONTENGA la fecha target (diferente al exacto)
  SELECT id INTO existing_period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date <= target_date
    AND period_end_date >= target_date
    AND status IN ('open', 'processing')
  LIMIT 1;

  -- Si existe uno que contenga la fecha, devolverlo (evita solapamientos)
  IF existing_period_id IS NOT NULL THEN
    RAISE LOG 'create_payment_period_if_needed: Found existing overlapping period %', existing_period_id;
    RETURN existing_period_id;
  END IF;

  -- PASO 5: Calcular la fecha de pago antes de crear el período
  calculated_payment_date := calculate_payment_date(target_company_id, period_end);

  -- PASO 6: Crear el nuevo período (ahora con payment_date calculada)
  INSERT INTO company_payment_periods (
    company_id,
    period_start_date,
    period_end_date,
    period_frequency,
    payment_date,
    status
  ) VALUES (
    target_company_id,
    period_start,
    period_end,
    company_record.default_payment_frequency,
    calculated_payment_date,
    'open'
  ) RETURNING id INTO new_period_id;

  RAISE LOG 'create_payment_period_if_needed: Created new period % (%-%) with payment_date % for company %', 
    new_period_id, period_start, period_end, calculated_payment_date, target_company_id;

  -- PASO 7: Crear automáticamente los driver_period_calculations para todos los conductores activos
  FOR driver_record IN 
    SELECT DISTINCT ucr.user_id as driver_user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id = target_company_id
    AND ucr.role = 'driver'
    AND ucr.is_active = true
  LOOP
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      total_income,
      net_payment,
      payment_status,
      has_negative_balance
    ) VALUES (
      driver_record.driver_user_id,
      new_period_id,
      0, 0, 0, 0, 0, 0,
      'calculated',
      false
    )
    ON CONFLICT (driver_user_id, company_payment_period_id) DO NOTHING;

    RAISE LOG 'create_payment_period_if_needed: Created calculation for driver %', driver_record.driver_user_id;
  END LOOP;

  -- PASO 8: Generar instancias de deducciones recurrentes para el período
  RAISE LOG 'create_payment_period_if_needed: Generated recurring expenses for period %', new_period_id;

  RETURN new_period_id;
END;
$$;

-- Update existing periods that don't have payment_date set
UPDATE company_payment_periods 
SET payment_date = calculate_payment_date(company_id, period_end_date)
WHERE payment_date IS NULL 
  AND status IN ('open', 'processing', 'closed');