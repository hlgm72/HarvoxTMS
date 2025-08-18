-- Reset load 25-384 by directly updating and cleaning history
DO $$
DECLARE
  target_load_id UUID;
  old_status TEXT;
BEGIN
  -- Get the load ID and current status for load number 25-384
  SELECT id, status INTO target_load_id, old_status
  FROM loads 
  WHERE load_number = '25-384';
  
  IF target_load_id IS NOT NULL THEN
    -- First, clear all existing history for this load
    DELETE FROM load_status_history 
    WHERE load_id = target_load_id;
    
    -- Update the load status directly (this will trigger the history log)
    UPDATE loads 
    SET status = 'assigned'
    WHERE id = target_load_id;
    
    RAISE NOTICE 'Load 25-384 (ID: %) reset from % to assigned with history cleared', target_load_id, old_status;
  ELSE
    RAISE NOTICE 'Load 25-384 not found';
  END IF;
END $$;