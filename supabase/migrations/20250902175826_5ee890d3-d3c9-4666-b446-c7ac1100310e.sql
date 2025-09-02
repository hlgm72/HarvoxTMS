-- Fix: Create proper trigger function and trigger for loads (corrected version)
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_loads()
RETURNS TRIGGER AS $$
DECLARE
  target_company_payment_period_id UUID;
  target_driver_user_id UUID;
BEGIN
  -- Determine the values based on operation type
  IF TG_OP = 'DELETE' THEN
    target_company_payment_period_id := OLD.payment_period_id;
    target_driver_user_id := OLD.driver_user_id;
  ELSE
    target_company_payment_period_id := NEW.payment_period_id;
    target_driver_user_id := NEW.driver_user_id;
  END IF;
  
  -- Only proceed if there's a valid payment period and driver
  IF target_company_payment_period_id IS NOT NULL AND target_driver_user_id IS NOT NULL THEN
    RAISE LOG '🔄 TRIGGER_LOADS: Operation % - Executing recalculation for driver % in period %', 
      TG_OP, target_driver_user_id, target_company_payment_period_id;
    
    -- Execute the recalculation
    PERFORM auto_recalculate_driver_payment_period_v2(
      target_driver_user_id,
      target_company_payment_period_id
    );
    
    RAISE LOG '✅ TRIGGER_LOADS: Recalculation completed for driver % in period %',
      target_driver_user_id, target_company_payment_period_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads ON public.loads;

CREATE TRIGGER trigger_auto_recalc_loads
  AFTER INSERT OR UPDATE OR DELETE ON public.loads
  FOR EACH ROW 
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads();