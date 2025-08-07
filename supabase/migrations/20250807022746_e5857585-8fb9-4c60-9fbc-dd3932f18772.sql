-- Check if there are any other functions referencing the wrong column
-- First, let's look for any triggers or functions that might be calling recalculate_payment_period_totals
-- and fix the auto_recalculate_on_other_income trigger

-- Fix the auto_recalculate_on_other_income function
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_other_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_period_id UUID;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  IF target_user_id IS NOT NULL AND target_period_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(target_period_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Also make sure the other_income table has the trigger attached
DROP TRIGGER IF EXISTS auto_recalculate_other_income_trigger ON other_income;
CREATE TRIGGER auto_recalculate_other_income_trigger
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_other_income();