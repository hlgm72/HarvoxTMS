-- Reset load 25-384 by temporarily replacing the trigger system
-- Drop all triggers and functions with CASCADE
DROP TRIGGER IF EXISTS log_load_status_change_trigger ON loads CASCADE;
DROP TRIGGER IF EXISTS loads_status_change_trigger ON loads CASCADE;
DROP FUNCTION IF EXISTS log_load_status_change() CASCADE;

-- Create a safe temporary function
CREATE OR REPLACE FUNCTION log_load_status_change_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if we have a valid user, otherwise skip logging
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.load_status_history (
      load_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      now(),
      'Status changed automatically'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the safe trigger
CREATE TRIGGER loads_status_change_trigger
  AFTER UPDATE OF status ON loads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_load_status_change_safe();

-- Now reset the load safely
DO $$
DECLARE
  target_load_id UUID;
  old_status TEXT;
BEGIN
  SELECT id, status INTO target_load_id, old_status
  FROM loads 
  WHERE load_number = '25-384';
  
  IF target_load_id IS NOT NULL THEN
    -- Clear all existing history
    DELETE FROM load_status_history WHERE load_id = target_load_id;
    
    -- Update the load status (trigger will skip logging since no auth.uid)
    UPDATE loads SET status = 'assigned' WHERE id = target_load_id;
    
    -- Add a clean manual history entry
    INSERT INTO load_status_history (
      load_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      target_load_id,
      NULL,
      'assigned',
      '00000000-0000-0000-0000-000000000000'::UUID,
      now(),
      'Load reset to assigned - history cleared'
    );
    
    RAISE NOTICE 'Load 25-384 successfully reset from % to assigned', old_status;
  ELSE
    RAISE NOTICE 'Load 25-384 not found';
  END IF;
END $$;