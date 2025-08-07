-- Fix security warning: Set immutable search_path for function
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_load_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_period_id UUID;
  target_driver_id UUID;
BEGIN
  -- Determine the period and driver to recalculate based on operation
  IF TG_OP = 'DELETE' THEN
    target_period_id := OLD.payment_period_id;
    target_driver_id := OLD.driver_user_id;
  ELSE
    target_period_id := NEW.payment_period_id;
    target_driver_id := NEW.driver_user_id;
    
    -- Also recalculate old period if driver or period changed
    IF TG_OP = 'UPDATE' AND (
      OLD.payment_period_id != NEW.payment_period_id OR 
      OLD.driver_user_id != NEW.driver_user_id
    ) THEN
      -- Recalculate old period/driver combination
      PERFORM calculate_driver_payment_period_with_validation(
        (SELECT id FROM driver_period_calculations 
         WHERE company_payment_period_id = OLD.payment_period_id 
         AND driver_user_id = OLD.driver_user_id 
         LIMIT 1)
      );
    END IF;
  END IF;
  
  -- Recalculate the target period if we have valid IDs
  IF target_period_id IS NOT NULL AND target_driver_id IS NOT NULL THEN
    PERFORM calculate_driver_payment_period_with_validation(
      (SELECT id FROM driver_period_calculations 
       WHERE company_payment_period_id = target_period_id 
       AND driver_user_id = target_driver_id 
       LIMIT 1)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;