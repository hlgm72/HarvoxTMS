-- Recreate triggers with correct syntax
-- First, update the current load manually
UPDATE public.loads 
SET payment_period_id = '6109b35c-ca0e-4eff-9655-ddc614818ab5'
WHERE id = 'f580b017-2759-4797-86c5-35e19ca96b70';

-- Drop any existing triggers
DROP TRIGGER IF EXISTS assign_payment_period_after_stops_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS assign_payment_period_simple_trigger ON public.loads;
DROP TRIGGER IF EXISTS update_load_dates_from_stops_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS handle_load_stops_changes_trigger ON public.load_stops;

-- Create a simple function to assign payment period to a specific load
CREATE OR REPLACE FUNCTION public.assign_payment_period_to_load_by_id(load_id_param uuid)
RETURNS void
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
  -- Get the load record
  SELECT * INTO load_record FROM public.loads WHERE id = load_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
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
    WHERE id = load_id_param;
  END IF;
END;
$$;

-- Create trigger function for load_stops
CREATE OR REPLACE FUNCTION public.trigger_assign_payment_period_after_stops()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Call the assignment function for the affected load
  PERFORM public.assign_payment_period_to_load_by_id(COALESCE(NEW.load_id, OLD.load_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger on load_stops
CREATE TRIGGER assign_payment_period_after_stops_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_assign_payment_period_after_stops();