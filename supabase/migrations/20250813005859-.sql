-- Fix the ambiguous column reference in the trigger function
CREATE OR REPLACE FUNCTION public.trigger_payment_recalculation_after_load_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculation_id UUID;
BEGIN
  -- Only process if load has a driver and payment_period_id
  IF NEW.driver_user_id IS NULL OR NEW.payment_period_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find the driver's payment calculation for this period
  -- ✅ FIX: Fully qualify column names to avoid ambiguity
  SELECT dpc.id INTO calculation_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.driver_user_id = NEW.driver_user_id
    AND cpp.id = NEW.payment_period_id
    AND NOT cpp.is_locked;
  
  -- If calculation exists and period is not locked, recalculate
  IF calculation_id IS NOT NULL THEN
    PERFORM calculate_driver_payment_period(calculation_id);
    RAISE NOTICE 'Recalculated payment period % for driver % after load change', calculation_id, NEW.driver_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;