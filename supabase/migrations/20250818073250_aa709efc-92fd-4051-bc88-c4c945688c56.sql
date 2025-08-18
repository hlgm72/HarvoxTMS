-- Temporarily modify trigger to handle null auth.uid(), reset load, then restore trigger
-- First, drop the current trigger
DROP TRIGGER IF EXISTS log_load_status_change_trigger ON loads;
DROP FUNCTION IF EXISTS log_load_status_change();

-- Create a temporary function that handles null auth.uid()
CREATE OR REPLACE FUNCTION log_load_status_change_temp()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
    now(),
    'Status changed automatically'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create temporary trigger
CREATE TRIGGER log_load_status_change_trigger_temp
  AFTER UPDATE OF status ON loads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_load_status_change_temp();

-- Now reset the load
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
    
    -- Update the load status
    UPDATE loads SET status = 'assigned' WHERE id = target_load_id;
    
    RAISE NOTICE 'Load 25-384 reset from % to assigned', old_status;
  END IF;
END $$;

-- Restore the original trigger and function
DROP TRIGGER log_load_status_change_trigger_temp ON loads;
DROP FUNCTION log_load_status_change_temp();

-- Recreate original function
CREATE OR REPLACE FUNCTION log_load_status_change()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate original trigger
CREATE TRIGGER log_load_status_change_trigger
  AFTER UPDATE OF status ON loads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_load_status_change();