-- Fix the payment period assignment to work after stops are created
-- First, update the current load manually
UPDATE public.loads 
SET payment_period_id = '6109b35c-ca0e-4eff-9655-ddc614818ab5'
WHERE id = '82e6fbf0-61c2-4a48-a6ee-fbf95763d5aa';

-- Drop the existing triggers
DROP TRIGGER IF EXISTS assign_payment_period_trigger ON public.loads;
DROP TRIGGER IF EXISTS update_payment_period_trigger ON public.loads;

-- Create a new trigger that runs AFTER load_stops changes
CREATE OR REPLACE FUNCTION public.assign_payment_period_after_stops()
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
  load_record RECORD;
BEGIN
  -- Get the load record (for both INSERT and UPDATE on stops, we need the load info)
  SELECT * INTO load_record FROM public.loads WHERE id = COALESCE(NEW.load_id, OLD.load_id);
  
  -- Use the assigned driver or the user who created the load
  driver_user_id_to_use := COALESCE(load_record.driver_user_id, load_record.created_by);
  
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
      target_date := COALESCE(load_record.delivery_date, load_record.pickup_date, CURRENT_DATE);
    ELSE -- pickup_date
      target_date := COALESCE(load_record.pickup_date, CURRENT_DATE);
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
    
    -- Update the load with the calculated period
    UPDATE public.loads 
    SET payment_period_id = calculated_period_id
    WHERE id = load_record.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on load_stops to assign payment period after stops are created/updated
CREATE TRIGGER assign_payment_period_after_stops_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_payment_period_after_stops();

-- Also create a simplified trigger for loads without stops (manual date entry)
CREATE OR REPLACE FUNCTION public.assign_payment_period_simple()
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
  -- Only run if pickup_date or delivery_date changed and there are no stops
  IF NOT EXISTS (SELECT 1 FROM public.load_stops WHERE load_id = NEW.id) THEN
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
      
      -- Assign the period to the load
      NEW.payment_period_id := calculated_period_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for loads without stops
CREATE TRIGGER assign_payment_period_simple_trigger
  BEFORE UPDATE ON public.loads
  FOR EACH ROW
  WHEN (
    OLD.pickup_date IS DISTINCT FROM NEW.pickup_date OR
    OLD.delivery_date IS DISTINCT FROM NEW.delivery_date OR
    OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id
  )
  EXECUTE FUNCTION public.assign_payment_period_simple();