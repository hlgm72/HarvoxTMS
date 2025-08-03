-- CRITICAL SECURITY FIXES
-- Fix 1: Enable RLS on loads_archive table and create proper policies
ALTER TABLE public.loads_archive ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for loads_archive (identical to loads table policies)
CREATE POLICY "Users can view loads_archive for their company" 
ON public.loads_archive 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND 
  (
    driver_user_id = auth.uid() OR
    created_by = auth.uid() OR
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
      ) 
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Company admins can manage loads_archive" 
ON public.loads_archive 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND 
  driver_user_id IN (
    SELECT ucr.user_id 
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id 
      FROM user_company_roles ucr2 
      WHERE ucr2.user_id = auth.uid() 
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.is_active = true
    ) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND 
  driver_user_id IN (
    SELECT ucr.user_id 
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id 
      FROM user_company_roles ucr2 
      WHERE ucr2.user_id = auth.uid() 
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.is_active = true
    ) 
    AND ucr.is_active = true
  )
);

-- Fix 2: Add immutable search_path to functions that need it
-- Update generate_recurring_expenses_for_period function
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

-- Update recalculate_payment_period_totals function
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(target_period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  calculation_record RECORD;
  total_loads NUMERIC := 0;
  total_fuel NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  gross_total NUMERIC := 0;
  net_total NUMERIC := 0;
  has_negative BOOLEAN := false;
BEGIN
  -- Get the payment period details
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Recalculate for each driver in this period
  FOR calculation_record IN
    SELECT * FROM driver_period_calculations
    WHERE company_payment_period_id = target_period_id
  LOOP
    -- Calculate loads total
    SELECT COALESCE(SUM(l.total_amount), 0) INTO total_loads
    FROM loads l
    WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = target_period_id
    AND l.status = 'completed';
    
    -- Calculate fuel expenses
    SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = target_period_id
    AND fe.status = 'verified';
    
    -- Calculate other deductions
    SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
    FROM expense_instances ei
    WHERE ei.driver_user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = calculation_record.id
    AND ei.status = 'applied';
    
    -- Calculate other income
    SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
    FROM other_income oi
    WHERE oi.driver_user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = target_period_id
    AND oi.status = 'approved';
    
    -- Calculate totals
    gross_total := total_loads + total_other_income;
    net_total := gross_total - total_fuel - total_deductions;
    has_negative := net_total < 0;
    
    -- Generate percentage-based deductions if needed
    PERFORM generate_load_percentage_deductions(null, calculation_record.id);
    
    -- Recalculate deductions after percentage deductions
    SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
    FROM expense_instances ei
    WHERE ei.driver_user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = calculation_record.id
    AND ei.status = 'applied';
    
    -- Recalculate final total
    net_total := gross_total - total_fuel - total_deductions;
    has_negative := net_total < 0;
    
    -- Update the calculation record
    UPDATE driver_period_calculations
    SET 
      gross_earnings = total_loads,
      fuel_expenses = total_fuel,
      total_deductions = total_deductions,
      other_income = total_other_income,
      total_income = gross_total,
      net_payment = net_total,
      has_negative_balance = has_negative,
      calculated_at = now(),
      calculated_by = auth.uid(),
      updated_at = now()
    WHERE id = calculation_record.id;
  END LOOP;
END;
$function$;