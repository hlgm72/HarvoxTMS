-- CRITICAL SECURITY FIXES - Part 2
-- Fix 2: Add immutable search_path to functions that need it

-- Drop and recreate generate_recurring_expenses_for_period function
DROP FUNCTION IF EXISTS public.generate_recurring_expenses_for_period(uuid);
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  template_record RECORD;
  generated_count INTEGER := 0;
  skipped_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Get period details
  SELECT * INTO period_record 
  FROM company_payment_periods 
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment period not found'
    );
  END IF;
  
  -- Generate expenses for all active recurring templates for drivers in this company
  FOR template_record IN 
    SELECT ret.* 
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id = period_record.company_id
    AND ucr.role = 'driver'
    AND ucr.is_active = true
    AND ret.is_active = true
    AND ret.start_date <= period_record.period_end_date
    AND (ret.end_date IS NULL OR ret.end_date >= period_record.period_start_date)
  LOOP
    -- Check if expense already exists for this period and template
    IF NOT EXISTS (
      SELECT 1 FROM expense_instances ei
      JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
      WHERE dpc.company_payment_period_id = period_id
      AND ei.recurring_template_id = template_record.id
      AND ei.driver_user_id = template_record.driver_user_id
    ) THEN
      -- Find the driver's calculation for this period
      INSERT INTO expense_instances (
        payment_period_id,
        expense_type_id,
        driver_user_id,
        recurring_template_id,
        amount,
        description,
        expense_date,
        status,
        priority,
        is_critical,
        created_by
      )
      SELECT 
        dpc.id,
        template_record.expense_type_id,
        template_record.driver_user_id,
        template_record.id,
        template_record.amount,
        template_record.description,
        period_record.period_end_date,
        'planned',
        template_record.priority,
        template_record.is_critical,
        auth.uid()
      FROM driver_period_calculations dpc
      WHERE dpc.company_payment_period_id = period_id
      AND dpc.driver_user_id = template_record.driver_user_id;
      
      generated_count := generated_count + 1;
    ELSE
      skipped_count := skipped_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'generated_count', generated_count,
    'skipped_count', skipped_count,
    'message', 'Recurring expenses generated successfully'
  );
END;
$function$;