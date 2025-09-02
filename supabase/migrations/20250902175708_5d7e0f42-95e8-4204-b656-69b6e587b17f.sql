-- Fix: Create proper trigger function and trigger for loads
-- First, create the trigger function that actually works
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_loads()
RETURNS TRIGGER AS $$
DECLARE
  target_company_payment_period_id UUID;
BEGIN
  -- Get the payment period ID from NEW or OLD record
  target_company_payment_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  -- Only proceed if there's a valid payment period
  IF target_company_payment_period_id IS NOT NULL THEN
    RAISE LOG '🔄 TRIGGER_LOADS: Executing recalculation for driver % in period %', 
      COALESCE(NEW.driver_user_id, OLD.driver_user_id), target_company_payment_period_id;
    
    -- Execute the recalculation
    PERFORM auto_recalculate_driver_payment_period_v2(
      COALESCE(NEW.driver_user_id, OLD.driver_user_id),
      target_company_payment_period_id
    );
    
    RAISE LOG '✅ TRIGGER_LOADS: Recalculation completed for driver % in period %',
      COALESCE(NEW.driver_user_id, OLD.driver_user_id), target_company_payment_period_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads ON public.loads;

CREATE TRIGGER trigger_auto_recalc_loads
  AFTER INSERT OR UPDATE OR DELETE ON public.loads
  FOR EACH ROW 
  WHEN (OLD.payment_period_id IS NOT NULL OR NEW.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads();