-- Reset load 25-384 using RPC function and clear history
DO $$
DECLARE
  target_load_id UUID;
  rpc_result JSONB;
BEGIN
  -- Get the load ID for load number 25-384
  SELECT id INTO target_load_id 
  FROM loads 
  WHERE load_number = '25-384';
  
  IF target_load_id IS NOT NULL THEN
    -- Delete all status history for this load first
    DELETE FROM load_status_history 
    WHERE load_id = target_load_id;
    
    -- Use the RPC function to update status (this handles the trigger properly)
    SELECT update_load_status_with_validation(target_load_id, 'assigned') INTO rpc_result;
    
    RAISE NOTICE 'Load 25-384 reset result: %', rpc_result;
  ELSE
    RAISE NOTICE 'Load 25-384 not found';
  END IF;
END $$;