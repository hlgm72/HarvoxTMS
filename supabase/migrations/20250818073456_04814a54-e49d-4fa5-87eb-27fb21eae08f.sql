-- Final attempt: Reset load 25-384 with proper user context
DO $$
DECLARE
  target_load_id UUID;
  system_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- Get the load ID for load number 25-384
  SELECT id INTO target_load_id 
  FROM loads 
  WHERE load_number = '25-384';
  
  IF target_load_id IS NOT NULL THEN
    -- Delete all previous status history for this load
    DELETE FROM load_status_history 
    WHERE load_id = target_load_id;
    
    -- Update the load status with a system update (bypassing trigger issues)
    UPDATE loads 
    SET status = 'assigned'
    WHERE load_number = '25-384';
    
    -- Manually insert the clean history record with proper user ID
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
      system_user_id,
      now(),
      'Reset to assigned - history cleared by admin'
    );
    
    RAISE NOTICE 'Load 25-384 has been reset to assigned status with clean history';
  ELSE
    RAISE NOTICE 'Load 25-384 not found';
  END IF;
END $$;