-- Corregir create_payment_period_if_needed para evitar duplicados

CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(target_company_id uuid, target_date date, created_by_user_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_period_id UUID;
  company_record RECORD;
  period_start DATE;
  period_end DATE;
  days_diff INTEGER;
  new_period_id UUID;
  driver_record RECORD;
  current_user_id UUID;
BEGIN
  -- Obtener usuario actual si no se proporciona
  current_user_id := COALESCE(created_by_user_id, auth.uid());
  
  -- LOG: Inicio de función
  RAISE LOG 'create_payment_period_if_needed: company=%, date=%, user=%', 
    target_company_id, target_date, current_user_id;

  -- PASO 1: Obtener configuración de la empresa PRIMERO
  SELECT * INTO company_record
  FROM companies
  WHERE id = target_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada: %', target_company_id;
  END IF;

  -- PASO 2: Calcular los límites del período basado en la frecuencia
  IF company_record.default_payment_frequency = 'weekly' THEN
    -- Semanal: Lunes a Domingo
    days_diff := EXTRACT(DOW FROM target_date)::INTEGER - 1;
    period_start := target_date - (days_diff || ' days')::INTERVAL;
    period_end := period_start + INTERVAL '6 days';
    
  ELSIF company_record.default_payment_frequency = 'biweekly' THEN
    -- Quincenal: Calcular basado en el día de inicio del ciclo
    days_diff := (target_date - 
      DATE(EXTRACT(YEAR FROM target_date) || '-01-' || 
      LPAD(company_record.payment_cycle_start_day::text, 2, '0')))::INTEGER % 14;
    period_start := target_date - (days_diff || ' days')::INTERVAL;
    period_end := period_start + INTERVAL '13 days';
    
  ELSE -- monthly
    -- Mensual: Primer día al último día del mes
    period_start := DATE_TRUNC('month', target_date)::DATE;
    period_end := (DATE_TRUNC('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  -- PASO 3: Verificar si ya existe un período con las FECHAS EXACTAS calculadas
  SELECT id INTO existing_period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date = period_start
    AND period_end_date = period_end
    AND status IN ('open', 'processing')
  LIMIT 1;

  -- Si existe con fechas exactas, devolverlo
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

  -- PASO 5: Crear el nuevo período (ahora sabemos que es seguro)
  INSERT INTO company_payment_periods (
    company_id,
    period_start_date,
    period_end_date,
    period_frequency,
    status
  ) VALUES (
    target_company_id,
    period_start,
    period_end,
    company_record.default_payment_frequency,
    'open'
  ) RETURNING id INTO new_period_id;

  RAISE LOG 'create_payment_period_if_needed: Created new period % (%-%) for company %', 
    new_period_id, period_start, period_end, target_company_id;

  -- PASO 6: Crear automáticamente los driver_period_calculations para todos los conductores activos
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
    ON CONFLICT (company_payment_period_id, driver_user_id) DO NOTHING;
    
    RAISE LOG 'create_payment_period_if_needed: Created calculation for driver %', driver_record.driver_user_id;
  END LOOP;

  -- PASO 7: Generar deducciones recurrentes para este período
  PERFORM generate_recurring_expenses_for_period(new_period_id);
  
  RAISE LOG 'create_payment_period_if_needed: Generated recurring expenses for period %', new_period_id;

  RETURN new_period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creando período bajo demanda: %', SQLERRM;
END;
$function$;