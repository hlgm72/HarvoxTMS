-- Simple direct reset of load 25-384
DO $$
DECLARE
  target_load_id UUID;
BEGIN
  -- Get the load ID for load number 25-384
  SELECT id INTO target_load_id 
  FROM loads 
  WHERE load_number = '25-384';
  
  IF target_load_id IS NOT NULL THEN
    -- Delete all status history for this load first
    DELETE FROM load_status_history 
    WHERE load_id = target_load_id;
    
    -- Disable the trigger temporarily
    ALTER TABLE loads DISABLE TRIGGER ALL;
    
    -- Update the load status directly
    UPDATE loads 
    SET 
      status = 'assigned',
      updated_at = now()
    WHERE id = target_load_id;
    
    -- Re-enable the trigger
    ALTER TABLE loads ENABLE TRIGGER ALL;
    
    -- Add a single clean history entry
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
    
    RAISE NOTICE 'Load 25-384 successfully reset to assigned status';
  ELSE
    RAISE NOTICE 'Load 25-384 not found';
  END IF;
END $$;