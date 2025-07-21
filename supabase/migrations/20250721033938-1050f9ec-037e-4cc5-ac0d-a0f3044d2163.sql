-- Check what's happening and create a more robust solution
-- First disable any triggers temporarily
ALTER TABLE public.loads DISABLE TRIGGER ALL;

-- Force the update
UPDATE public.loads 
SET payment_period_id = '6109b35c-ca0e-4eff-9655-ddc614818ab5'::uuid
WHERE id = 'd8d403fd-7bc4-43c4-af1f-1ade395184f6'::uuid;

-- Re-enable triggers
ALTER TABLE public.loads ENABLE TRIGGER ALL;

-- Update the trigger to also work on the loads table for manual updates
CREATE OR REPLACE FUNCTION public.auto_assign_payment_period_on_load_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_date DATE;
  period_id UUID;
  company_id UUID;
BEGIN
  -- Only run if payment_period_id is NULL and we have dates
  IF NEW.payment_period_id IS NULL AND (NEW.pickup_date IS NOT NULL OR NEW.delivery_date IS NOT NULL) THEN
    -- Get company
    SELECT ucr.company_id INTO company_id
    FROM public.user_company_roles ucr 
    WHERE ucr.user_id = COALESCE(NEW.driver_user_id, NEW.created_by)
    AND ucr.is_active = true
    LIMIT 1;
    
    -- Get target date
    target_date := COALESCE(NEW.pickup_date, NEW.delivery_date, CURRENT_DATE);
    
    -- Find period
    IF company_id IS NOT NULL THEN
      SELECT cpp.id INTO period_id
      FROM public.company_payment_periods cpp
      WHERE cpp.company_id = company_id
      AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
      AND cpp.status IN ('open', 'processing')
      LIMIT 1;
      
      NEW.payment_period_id := period_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on loads table
DROP TRIGGER IF EXISTS auto_assign_payment_period_on_load_update_trigger ON public.loads;
CREATE TRIGGER auto_assign_payment_period_on_load_update_trigger
  BEFORE UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_payment_period_on_load_update();