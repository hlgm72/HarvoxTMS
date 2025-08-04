-- Fix the generate_recurring_expenses_for_period function to use correct table name
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  template_record RECORD;
  instances_created INTEGER := 0;
  instances_skipped INTEGER := 0;
  errors_encountered INTEGER := 0;
BEGIN
  -- Get period information
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment period not found'
    );
  END IF;
  
  -- Get all active recurring expense templates for users in this company
  FOR template_record IN
    SELECT ert.*, ucr.user_id, ucr.company_id
    FROM expense_recurring_templates ert
    JOIN user_company_roles ucr ON ert.user_id = ucr.user_id
    WHERE ucr.company_id = period_record.company_id
    AND ucr.is_active = true
    AND ert.is_active = true
    AND ert.start_date <= period_record.period_end_date
    AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
  LOOP
    BEGIN
      -- Check if expense instance already exists for this template and period
      IF NOT EXISTS (
        SELECT 1 FROM expense_instances
        WHERE recurring_template_id = template_record.id
        AND payment_period_id IN (
          SELECT dpc.id FROM driver_period_calculations dpc
          WHERE dpc.company_payment_period_id = period_id
          AND dpc.driver_user_id = template_record.user_id
        )
      ) THEN
        -- Get the driver's calculation record for this period
        INSERT INTO expense_instances (
          payment_period_id,
          expense_type_id,
          user_id,
          amount,
          description,
          expense_date,
          status,
          recurring_template_id,
          created_by,
          applied_by,
          applied_at
        )
        SELECT 
          dpc.id,
          template_record.expense_type_id,
          template_record.user_id,
          template_record.amount,
          'Recurring expense from template: ' || et.name,
          period_record.period_end_date,
          'applied',
          template_record.id,
          template_record.created_by,
          template_record.created_by,
          now()
        FROM driver_period_calculations dpc
        JOIN expense_types et ON et.id = template_record.expense_type_id
        WHERE dpc.company_payment_period_id = period_id
        AND dpc.driver_user_id = template_record.user_id;
        
        instances_created := instances_created + 1;
      ELSE
        instances_skipped := instances_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      errors_encountered := errors_encountered + 1;
      RAISE NOTICE 'Error creating expense instance for template %: %', template_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'period_id', period_id,
    'instances_created', instances_created,
    'instances_skipped', instances_skipped,
    'errors_encountered', errors_encountered,
    'message', format('Generated %s recurring expenses, skipped %s existing, %s errors', 
                     instances_created, instances_skipped, errors_encountered)
  );
END;
$function$;