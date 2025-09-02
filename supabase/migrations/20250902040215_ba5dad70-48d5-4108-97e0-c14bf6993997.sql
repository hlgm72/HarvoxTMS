-- Fix the create_payment_period_if_needed function to prevent duplicate expense instances
-- The issue is that when creating recurring deductions, it doesn't check for existing ones

CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(
  target_company_id UUID, 
  target_date DATE, 
  target_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  period_id UUID;
  company_frequency TEXT;
  period_start DATE;
  period_end DATE;
  driver_record RECORD;
  calculation_id UUID;
  max_future_date DATE := CURRENT_DATE + INTERVAL '21 days';
  current_user_id UUID;
  recurring_expense RECORD;
  existing_instance_count INTEGER;
BEGIN
  -- Get current user (fallback to target_user_id if provided)
  current_user_id := COALESCE(auth.uid(), target_user_id);
  
  -- Log function call
  RAISE LOG 'create_payment_period_if_needed: company=%, date=%, user=%, max_future=%', 
    target_company_id, target_date, current_user_id, max_future_date;

  -- Get company payment frequency
  SELECT default_payment_frequency INTO company_frequency
  FROM companies
  WHERE id = target_company_id;

  IF company_frequency IS NULL THEN
    RAISE EXCEPTION 'Company not found or no payment frequency configured';
  END IF;

  -- Calculate period boundaries based on frequency
  IF company_frequency = 'weekly' THEN
    -- Weekly: Monday to Sunday
    period_start := target_date - EXTRACT(DOW FROM target_date)::INTEGER + 1;
    period_end := period_start + INTERVAL '6 days';
  ELSIF company_frequency = 'biweekly' THEN
    -- Biweekly: 14-day periods starting from a reference date
    period_start := target_date - (EXTRACT(EPOCH FROM (target_date - '2025-01-06'::DATE))::INTEGER / 86400) % 14;
    period_end := period_start + INTERVAL '13 days';
  ELSE -- monthly
    period_start := DATE_TRUNC('month', target_date)::DATE;
    period_end := (DATE_TRUNC('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
  END IF;

  -- Check if period already exists
  SELECT id INTO period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date = period_start
    AND period_end_date = period_end;

  -- If period doesn't exist, create it
  IF period_id IS NULL THEN
    -- Validate we're not creating periods too far in the future
    IF period_start > max_future_date THEN
      RAISE EXCEPTION 'Cannot create payment period starting % - too far in future (limit: %)', 
        period_start, max_future_date;
    END IF;

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
      company_frequency,
      'open'
    ) RETURNING id INTO period_id;

    RAISE LOG 'create_payment_period_if_needed: Created ALLOWED period % (%-%) for company %', 
      period_id, period_start, period_end, target_company_id;

    -- Create driver calculations for all active drivers
    FOR driver_record IN
      SELECT DISTINCT user_id
      FROM user_company_roles
      WHERE company_id = target_company_id
        AND role = 'driver'
        AND is_active = true
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
        driver_record.user_id,
        period_id,
        0,
        0,
        0,
        0,
        0,
        0,
        'calculated',
        false
      ) RETURNING id INTO calculation_id;

      RAISE LOG 'create_payment_period_if_needed: Created calculation for driver %', driver_record.user_id;

      -- Generate recurring expense instances for this driver
      FOR recurring_expense IN
        SELECT et.id as expense_type_id, et.default_amount, et.description
        FROM expense_types et
        WHERE et.company_id = target_company_id
          AND et.is_recurring = true
          AND et.is_active = true
          AND et.applies_to_role = 'driver'
      LOOP
        -- Check if expense instance already exists for this combination
        SELECT COUNT(*) INTO existing_instance_count
        FROM expense_instances
        WHERE payment_period_id = calculation_id
          AND expense_type_id = recurring_expense.expense_type_id;

        -- Only create if it doesn't already exist
        IF existing_instance_count = 0 THEN
          INSERT INTO expense_instances (
            payment_period_id,
            user_id,
            expense_type_id,
            amount,
            description,
            status,
            applied_at,
            applied_by
          ) VALUES (
            calculation_id,
            driver_record.user_id,
            recurring_expense.expense_type_id,
            recurring_expense.default_amount,
            recurring_expense.description,
            'applied',
            now(),
            current_user_id
          );
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creando período bajo demanda: %', SQLERRM;
END;
$function$;