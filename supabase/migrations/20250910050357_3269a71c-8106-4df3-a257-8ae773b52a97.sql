-- Add percentage column to expense_recurring_templates table
ALTER TABLE public.expense_recurring_templates 
ADD COLUMN IF NOT EXISTS percentage numeric(5,2) DEFAULT 0;

-- Create expense types for percentage deductions if they don't exist
INSERT INTO public.expense_types (name, category, description) 
VALUES 
  ('Dispatching', 'percentage_deduction', 'Percentage-based dispatching fees'),
  ('Factoring', 'percentage_deduction', 'Percentage-based factoring fees'),
  ('Leasing', 'percentage_deduction', 'Percentage-based leasing fees')
ON CONFLICT (name) DO NOTHING;

-- Function to create default percentage templates for a driver based on company settings
CREATE OR REPLACE FUNCTION public.create_default_percentage_templates(driver_user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_record RECORD;
  expense_type_record RECORD;
  created_templates jsonb[] := '{}';
  existing_template_id uuid;
BEGIN
  -- Get company settings for the driver
  SELECT c.* INTO company_record
  FROM companies c
  JOIN user_company_roles ucr ON c.id = ucr.company_id
  WHERE ucr.user_id = driver_user_id_param
    AND ucr.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No company found for driver';
  END IF;

  -- Create dispatching template if percentage > 0
  IF company_record.default_dispatching_percentage > 0 THEN
    SELECT id INTO expense_type_record
    FROM expense_types 
    WHERE name = 'Dispatching' AND category = 'percentage_deduction'
    LIMIT 1;
    
    IF FOUND THEN
      -- Check if template already exists
      SELECT id INTO existing_template_id
      FROM expense_recurring_templates 
      WHERE expense_type_id = expense_type_record.id 
        AND user_id = driver_user_id_param;
        
      IF existing_template_id IS NULL THEN
        INSERT INTO expense_recurring_templates (
          expense_type_id,
          user_id,
          frequency,
          amount,
          percentage,
          start_date,
          is_active,
          notes,
          created_by
        ) VALUES (
          expense_type_record.id,
          driver_user_id_param,
          'per_load',
          0, -- amount is 0 for percentage deductions
          company_record.default_dispatching_percentage,
          CURRENT_DATE,
          true,
          'Auto-created dispatching percentage template',
          auth.uid()
        );
      ELSE
        UPDATE expense_recurring_templates SET
          percentage = company_record.default_dispatching_percentage,
          updated_at = now()
        WHERE id = existing_template_id;
      END IF;
        
      created_templates := created_templates || jsonb_build_object(
        'type', 'dispatching',
        'percentage', company_record.default_dispatching_percentage
      );
    END IF;
  END IF;

  -- Create factoring template if percentage > 0
  IF company_record.default_factoring_percentage > 0 THEN
    SELECT id INTO expense_type_record
    FROM expense_types 
    WHERE name = 'Factoring' AND category = 'percentage_deduction'
    LIMIT 1;
    
    IF FOUND THEN
      -- Check if template already exists
      SELECT id INTO existing_template_id
      FROM expense_recurring_templates 
      WHERE expense_type_id = expense_type_record.id 
        AND user_id = driver_user_id_param;
        
      IF existing_template_id IS NULL THEN
        INSERT INTO expense_recurring_templates (
          expense_type_id,
          user_id,
          frequency,
          amount,
          percentage,
          start_date,
          is_active,
          notes,
          created_by
        ) VALUES (
          expense_type_record.id,
          driver_user_id_param,
          'per_load',
          0,
          company_record.default_factoring_percentage,
          CURRENT_DATE,
          true,
          'Auto-created factoring percentage template',
          auth.uid()
        );
      ELSE
        UPDATE expense_recurring_templates SET
          percentage = company_record.default_factoring_percentage,
          updated_at = now()
        WHERE id = existing_template_id;
      END IF;
        
      created_templates := created_templates || jsonb_build_object(
        'type', 'factoring',
        'percentage', company_record.default_factoring_percentage
      );
    END IF;
  END IF;

  -- Create leasing template if percentage > 0
  IF company_record.default_leasing_percentage > 0 THEN
    SELECT id INTO expense_type_record
    FROM expense_types 
    WHERE name = 'Leasing' AND category = 'percentage_deduction'
    LIMIT 1;
    
    IF FOUND THEN
      -- Check if template already exists
      SELECT id INTO existing_template_id
      FROM expense_recurring_templates 
      WHERE expense_type_id = expense_type_record.id 
        AND user_id = driver_user_id_param;
        
      IF existing_template_id IS NULL THEN
        INSERT INTO expense_recurring_templates (
          expense_type_id,
          user_id,
          frequency,
          amount,
          percentage,
          start_date,
          is_active,
          notes,
          created_by
        ) VALUES (
          expense_type_record.id,
          driver_user_id_param,
          'per_load',
          0,
          company_record.default_leasing_percentage,
          CURRENT_DATE,
          true,
          'Auto-created leasing percentage template',
          auth.uid()
        );
      ELSE
        UPDATE expense_recurring_templates SET
          percentage = company_record.default_leasing_percentage,
          updated_at = now()
        WHERE id = existing_template_id;
      END IF;
        
      created_templates := created_templates || jsonb_build_object(
        'type', 'leasing',
        'percentage', company_record.default_leasing_percentage
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'templates_created', array_length(created_templates, 1),
    'templates', created_templates,
    'driver_user_id', driver_user_id_param
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creating default percentage templates: %', SQLERRM;
END;
$function$;

-- Update create_percentage_deductions_for_load to use correct table and column names
CREATE OR REPLACE FUNCTION public.create_percentage_deductions_for_load(
  load_id_param uuid, 
  driver_user_id_param uuid, 
  target_payment_period_id uuid,
  total_amount_param numeric,
  load_number_param text,
  is_update_mode boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  template_record RECORD;
  deduction_amount NUMERIC;
  created_deductions JSONB[] := '{}';
  templates_created INTEGER := 0;
BEGIN
  -- If this is an update, first clean up existing percentage deductions
  IF is_update_mode THEN
    PERFORM cleanup_load_percentage_deductions(load_id_param);
  END IF;

  -- First, ensure default templates exist for this driver
  PERFORM create_default_percentage_templates(driver_user_id_param);

  -- Create percentage-based deductions using the correct table name
  FOR template_record IN 
    SELECT ert.*, et.name as expense_type_name, et.category
    FROM expense_recurring_templates ert
    JOIN expense_types et ON ert.expense_type_id = et.id
    WHERE ert.user_id = driver_user_id_param
      AND ert.is_active = true
      AND et.category = 'percentage_deduction'
      AND ert.percentage > 0
  LOOP
    -- Calculate deduction amount based on percentage
    deduction_amount := (total_amount_param * template_record.percentage / 100);
    
    -- Create the expense instance
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      user_id,
      amount,
      description,
      recurring_template_id,
      status,
      applied_at,
      applied_by,
      notes,
      expense_date,
      priority,
      is_critical
    ) VALUES (
      target_payment_period_id,
      template_record.expense_type_id,
      driver_user_id_param,
      deduction_amount,
      template_record.expense_type_name || ' fees',
      template_record.id,
      'applied',
      now(),
      auth.uid(),
      'Auto-generated percentage deduction for Load #' || load_number_param || ' (' || template_record.percentage || '%)',
      CURRENT_DATE,
      5,
      false
    );

    -- Track created deduction
    created_deductions := created_deductions || jsonb_build_object(
      'expense_type', template_record.expense_type_name,
      'percentage', template_record.percentage,
      'amount', deduction_amount
    );
    
    templates_created := templates_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'deductions_created', templates_created,
    'deductions', created_deductions,
    'load_id', load_id_param,
    'payment_period_id', target_payment_period_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creating percentage deductions: %', SQLERRM;
END;
$function$;