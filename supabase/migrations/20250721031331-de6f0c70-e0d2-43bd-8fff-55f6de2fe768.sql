-- Update the existing load with the correct payment period
UPDATE public.loads 
SET payment_period_id = '1d281497-ec51-40f6-9ac0-3a0dd7704df2'
WHERE load_number = '25-377';

-- Fix the trigger to handle loads without drivers
DROP TRIGGER IF EXISTS assign_payment_period_trigger ON public.loads;
DROP TRIGGER IF EXISTS update_payment_period_trigger ON public.loads;

-- Create updated trigger function that works for loads without drivers
CREATE OR REPLACE FUNCTION public.assign_payment_period_to_load()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  company_id_found UUID;
  driver_user_id_to_use UUID;
BEGIN
  -- Use the assigned driver or the user creating the load
  driver_user_id_to_use := COALESCE(NEW.driver_user_id, NEW.created_by);
  
  -- Get company and assignment criteria
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id
  WHERE ucr.user_id = driver_user_id_to_use 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- If we found a company, assign the period
  IF company_id_found IS NOT NULL THEN
    -- Determine target date based on criteria
    IF assignment_criteria = 'delivery_date' THEN
      target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
    ELSE -- pickup_date
      target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
    END IF;
    
    -- Get the appropriate payment period for the company
    SELECT cpp.id INTO calculated_period_id
    FROM public.company_payment_periods cpp
    WHERE cpp.company_id = company_id_found
    AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
    AND cpp.status IN ('open', 'processing')
    LIMIT 1;
    
    -- If no period found, try to generate one
    IF calculated_period_id IS NULL THEN
      PERFORM public.generate_payment_periods(
        company_id_found,
        target_date - INTERVAL '7 days',
        target_date + INTERVAL '30 days'
      );
      
      -- Try to find the period again
      SELECT cpp.id INTO calculated_period_id
      FROM public.company_payment_periods cpp
      WHERE cpp.company_id = company_id_found
      AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
      AND cpp.status IN ('open', 'processing')
      LIMIT 1;
    END IF;
    
    -- Assign the period to the load
    NEW.payment_period_id := calculated_period_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for new loads
CREATE TRIGGER assign_payment_period_trigger
  BEFORE INSERT ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_payment_period_to_load();

-- Create the trigger for load updates
CREATE TRIGGER update_payment_period_trigger
  BEFORE UPDATE ON public.loads
  FOR EACH ROW
  WHEN (
    OLD.pickup_date IS DISTINCT FROM NEW.pickup_date OR
    OLD.delivery_date IS DISTINCT FROM NEW.delivery_date OR
    OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id
  )
  EXECUTE FUNCTION public.assign_payment_period_to_load();