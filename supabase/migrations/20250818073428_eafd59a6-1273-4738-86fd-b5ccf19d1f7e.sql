-- Fix the trigger function to handle null auth.uid() in migrations
CREATE OR REPLACE FUNCTION public.log_load_status_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID, use system ID if null (for migrations)
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Insert into load status history
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
    current_user_id,
    now(),
    'Status changed automatically'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now reset the load 25-384
DO $$
DECLARE
  target_load_id UUID;
BEGIN
  -- Get the load ID for load number 25-384
  SELECT id INTO target_load_id 
  FROM loads 
  WHERE load_number = '25-384';
  
  IF target_load_id IS NOT NULL THEN
    -- Delete all previous status history for this load
    DELETE FROM load_status_history 
    WHERE load_id = target_load_id;
    
    -- Update the load status (trigger will now work properly)
    UPDATE loads 
    SET status = 'assigned'
    WHERE load_number = '25-384';
    
    RAISE NOTICE 'Load 25-384 has been reset to assigned status with clean history';
  ELSE
    RAISE NOTICE 'Load 25-384 not found';
  END IF;
END $$;