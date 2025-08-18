-- Corrigir la función generate_company_payment_periods_with_calculations
-- El problema está en las operaciones de fecha que necesitan usar INTERVAL

CREATE OR REPLACE FUNCTION public.generate_company_payment_periods_with_calculations(target_company_id uuid, start_date date, end_date date, run_calculations boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_record RECORD;
  period_record RECORD;
  period_start DATE;
  period_end DATE;
  periods_created INTEGER := 0;
  calculations_created INTEGER := 0;
  current_user_id UUID;
  driver_record RECORD;
  calculation_id UUID;
  current_date_iter DATE;
  days_diff INTEGER;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get company settings
  SELECT * INTO company_record
  FROM companies
  WHERE id = target_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada';
  END IF;

  -- Validate user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para generar períodos para esta empresa';
  END IF;

  -- Generate periods based on frequency
  current_date_iter := start_date;
  
  WHILE current_date_iter <= end_date LOOP
    -- Calculate period boundaries based on frequency
    IF company_record.default_payment_frequency = 'weekly' THEN
      -- Find start of week (Monday) - Fix: use INTERVAL for date arithmetic
      days_diff := EXTRACT(DOW FROM current_date_iter)::INTEGER - 1;
      period_start := current_date_iter - (days_diff || ' days')::INTERVAL;
      period_end := period_start + INTERVAL '6 days';
    ELSIF company_record.default_payment_frequency = 'biweekly' THEN
      -- Calculate biweekly periods starting from payment_cycle_start_day
      days_diff := (current_date_iter - 
        DATE(EXTRACT(YEAR FROM current_date_iter) || '-01-' || 
        LPAD(company_record.payment_cycle_start_day::text, 2, '0')))::INTEGER % 14;
      period_start := current_date_iter - (days_diff || ' days')::INTERVAL;
      period_end := period_start + INTERVAL '13 days';
    ELSE -- monthly
      period_start := DATE_TRUNC('month', current_date_iter)::DATE;
      period_end := (DATE_TRUNC('month', current_date_iter) + INTERVAL '1 month - 1 day')::DATE;
    END IF;

    -- Check if period already exists
    IF NOT EXISTS (
      SELECT 1 FROM company_payment_periods cpp
      WHERE cpp.company_id = target_company_id
      AND cpp.period_start_date = period_start
      AND cpp.period_end_date = period_end
    ) THEN
      -- Create the payment period
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
      );
      
      periods_created := periods_created + 1;
    END IF;

    -- Generate driver calculations if requested
    IF run_calculations THEN
      FOR driver_record IN 
        SELECT DISTINCT ucr.user_id as driver_user_id
        FROM user_company_roles ucr
        WHERE ucr.company_id = target_company_id
        AND ucr.role = 'driver'
        AND ucr.is_active = true
      LOOP
        -- Check if calculation already exists for this driver and period
        IF NOT EXISTS (
          SELECT 1 FROM driver_period_calculations dpc
          JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
          WHERE cpp.company_id = target_company_id
          AND cpp.period_start_date = period_start
          AND cpp.period_end_date = period_end
          AND dpc.driver_user_id = driver_record.driver_user_id
        ) THEN
          -- Get the period ID
          SELECT cpp.id INTO calculation_id
          FROM company_payment_periods cpp
          WHERE cpp.company_id = target_company_id
          AND cpp.period_start_date = period_start
          AND cpp.period_end_date = period_end;

          -- Create driver calculation record
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
            calculation_id,
            0,
            0,
            0,
            0,
            0,
            0,
            'calculated',
            false
          );

          calculations_created := calculations_created + 1;
        END IF;
      END LOOP;
    END IF;

    -- Move to next period
    IF company_record.default_payment_frequency = 'weekly' THEN
      current_date_iter := current_date_iter + INTERVAL '7 days';
    ELSIF company_record.default_payment_frequency = 'biweekly' THEN
      current_date_iter := current_date_iter + INTERVAL '14 days';
    ELSE -- monthly
      current_date_iter := (DATE_TRUNC('month', current_date_iter) + INTERVAL '1 month')::DATE;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'periods_created', periods_created,
    'calculations_created', calculations_created,
    'company_id', target_company_id,
    'frequency', company_record.default_payment_frequency,
    'date_range', jsonb_build_object(
      'start_date', start_date,
      'end_date', end_date
    )
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error generando períodos: %', SQLERRM;
END;
$function$;