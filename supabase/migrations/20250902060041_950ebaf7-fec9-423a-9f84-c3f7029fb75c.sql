-- Fix create_payment_period_if_needed to handle past dates correctly
-- and debug why it's returning NULL for 2025-08-26

CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(
  target_company_id UUID,
  target_date DATE,
  target_user_id UUID DEFAULT NULL
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_id UUID;
  existing_period_id UUID;
  period_start_date DATE;
  period_end_date DATE;
  frequency TEXT;
  cycle_start_day INTEGER;
  max_future_date DATE := CURRENT_DATE + INTERVAL '30 days'; -- Increased from 14 to 30 days
  driver_calc_id UUID;
BEGIN
  -- Enhanced logging with call stack
  RAISE LOG 'create_payment_period_if_needed: Called for company=%, date=%, user=%', 
    target_company_id, target_date, target_user_id;

  -- RELAXED VALIDATION: Allow reasonable past and future dates
  -- Only block dates that are extremely far in the future (more than 30 days)
  IF target_date > max_future_date THEN
    RAISE LOG 'create_payment_period_if_needed: BLOCKED - Date % is too far in future (limit: %)', 
      target_date, max_future_date;
    RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Cannot create loads with pickup dates more than 30 days in the future. Pickup date: %, Max allowed: %', 
      target_date, max_future_date;
  END IF;

  -- Get company payment settings
  SELECT 
    default_payment_frequency,
    payment_cycle_start_day
  INTO frequency, cycle_start_day
  FROM companies 
  WHERE id = target_company_id;

  IF NOT FOUND THEN
    RAISE LOG 'create_payment_period_if_needed: Company % not found', target_company_id;
    RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Company not found for ID %', target_company_id;
  END IF;

  RAISE LOG 'create_payment_period_if_needed: Company settings - frequency=%, cycle_start_day=%', 
    frequency, cycle_start_day;

  -- Calculate period boundaries based on frequency
  IF frequency = 'weekly' THEN
    -- Calculate weekly period: Monday to Sunday
    period_start_date := target_date - (EXTRACT(DOW FROM target_date)::INTEGER - 1) * INTERVAL '1 day';
    period_end_date := period_start_date + INTERVAL '6 days';
    
    RAISE LOG 'create_payment_period_if_needed: Weekly calculation - start=%, end=%', 
      period_start_date, period_end_date;
      
  ELSIF frequency = 'biweekly' THEN
    -- Calculate biweekly periods
    DECLARE
      days_since_cycle_start INTEGER;
      cycle_reference_date DATE;
    BEGIN
      cycle_reference_date := DATE(EXTRACT(YEAR FROM target_date) || '-01-' || LPAD(cycle_start_day::text, 2, '0'));
      days_since_cycle_start := (target_date - cycle_reference_date)::INTEGER;
      period_start_date := target_date - (days_since_cycle_start % 14) * INTERVAL '1 day';
      period_end_date := period_start_date + INTERVAL '13 days';
      
      RAISE LOG 'create_payment_period_if_needed: Biweekly calculation - start=%, end=%', 
        period_start_date, period_end_date;
    END;
    
  ELSE -- monthly
    period_start_date := DATE_TRUNC('month', target_date)::DATE;
    period_end_date := (DATE_TRUNC('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
    
    RAISE LOG 'create_payment_period_if_needed: Monthly calculation - start=%, end=%', 
      period_start_date, period_end_date;
  END IF;

  -- Check if period already exists
  SELECT id INTO existing_period_id
  FROM company_payment_periods cpp
  WHERE cpp.company_id = target_company_id
    AND cpp.period_start_date = period_start_date
    AND cpp.period_end_date = period_end_date;

  IF existing_period_id IS NOT NULL THEN
    RAISE LOG 'create_payment_period_if_needed: Using existing period % for company %', 
      existing_period_id, target_company_id;
    
    -- If a specific user is provided, ensure their driver calculation exists
    IF target_user_id IS NOT NULL THEN
      SELECT id INTO driver_calc_id
      FROM driver_period_calculations
      WHERE company_payment_period_id = existing_period_id
        AND driver_user_id = target_user_id;
      
      IF driver_calc_id IS NULL THEN
        INSERT INTO driver_period_calculations (
          driver_user_id,
          company_payment_period_id,
          gross_earnings, fuel_expenses, total_deductions,
          other_income, total_income, net_payment,
          payment_status, has_negative_balance
        ) VALUES (
          target_user_id, existing_period_id,
          0, 0, 0, 0, 0, 0, 'calculated', false
        ) RETURNING id INTO driver_calc_id;
        
        RAISE LOG 'create_payment_period_if_needed: Created driver calculation % for user % in existing period', 
          driver_calc_id, target_user_id;
      END IF;
    END IF;
    
    RETURN existing_period_id;
  END IF;

  -- Create the payment period
  INSERT INTO company_payment_periods (
    company_id,
    period_start_date,
    period_end_date,
    period_frequency,
    status
  ) VALUES (
    target_company_id,
    period_start_date,
    period_end_date,
    frequency,
    'open'
  ) RETURNING id INTO period_id;

  RAISE LOG 'create_payment_period_if_needed: Created new period % for company %, dates: % - %',
    period_id, target_company_id, period_start_date, period_end_date;

  -- Only create driver calculation for the specific user if provided
  IF target_user_id IS NOT NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings, fuel_expenses, total_deductions,
      other_income, total_income, net_payment,
      payment_status, has_negative_balance
    ) VALUES (
      target_user_id, period_id,
      0, 0, 0, 0, 0, 0, 'calculated', false
    ) RETURNING id INTO driver_calc_id;
    
    RAISE LOG 'create_payment_period_if_needed: Created driver calculation % for user % in new period',
      driver_calc_id, target_user_id;
  END IF;

  -- Generate recurring expenses for the period (but don't create driver calculations)
  BEGIN
    PERFORM generate_recurring_expenses_for_period(period_id);
    RAISE LOG 'create_payment_period_if_needed: Generated recurring expenses for period %', period_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'create_payment_period_if_needed: WARNING - Failed to generate recurring expenses: %', SQLERRM;
    -- Continue execution - don't fail the whole operation
  END;

  RETURN period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'create_payment_period_if_needed: ERROR - %', SQLERRM;
  RAISE; -- Re-raise the exception with original message
END;
$function$;