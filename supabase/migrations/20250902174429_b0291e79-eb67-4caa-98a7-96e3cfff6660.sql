-- Create the missing triggers for loads table
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads ON public.loads;
CREATE TRIGGER trigger_auto_recalc_loads
  AFTER INSERT OR UPDATE OR DELETE ON public.loads
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

-- Verify the trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'loads' 
AND trigger_schema = 'public';