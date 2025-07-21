-- Fix all recent loads without payment periods
-- First, update all recent loads with the correct period for their dates
UPDATE public.loads 
SET payment_period_id = (
  SELECT cpp.id 
  FROM public.company_payment_periods cpp
  JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE ucr.user_id = loads.created_by
  AND ucr.is_active = true
  AND COALESCE(loads.pickup_date, CURRENT_DATE) BETWEEN cpp.period_start_date AND cpp.period_end_date
  AND cpp.status IN ('open', 'processing')
  LIMIT 1
)
WHERE payment_period_id IS NULL
AND created_at > '2025-07-21';

-- Create a much simpler trigger that works reliably
DROP TRIGGER IF EXISTS assign_payment_period_after_stops_trigger ON public.load_stops;

CREATE OR REPLACE FUNCTION public.simple_assign_payment_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_id_to_update UUID;
  target_date DATE;
  period_id UUID;
  company_id UUID;
BEGIN
  -- Get the load ID
  load_id_to_update := COALESCE(NEW.load_id, OLD.load_id);
  
  -- Get the updated dates and company info from the load
  SELECT 
    l.pickup_date,
    ucr.company_id
  INTO target_date, company_id
  FROM public.loads l
  JOIN public.user_company_roles ucr ON ucr.user_id = COALESCE(l.driver_user_id, l.created_by)
  WHERE l.id = load_id_to_update
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Find the appropriate period
  IF company_id IS NOT NULL THEN
    SELECT cpp.id INTO period_id
    FROM public.company_payment_periods cpp
    WHERE cpp.company_id = company_id
    AND COALESCE(target_date, CURRENT_DATE) BETWEEN cpp.period_start_date AND cpp.period_end_date
    AND cpp.status IN ('open', 'processing')
    LIMIT 1;
    
    -- Update the load
    UPDATE public.loads 
    SET payment_period_id = period_id
    WHERE id = load_id_to_update
    AND payment_period_id IS DISTINCT FROM period_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
CREATE TRIGGER simple_assign_payment_period_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_assign_payment_period();