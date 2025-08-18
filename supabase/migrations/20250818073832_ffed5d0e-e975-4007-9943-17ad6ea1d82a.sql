-- Fix function overloading conflict by dropping the conflicting function
-- and creating a single unified version

-- Drop the conflicting functions
DROP FUNCTION IF EXISTS public.update_load_status_with_validation(uuid, text);
DROP FUNCTION IF EXISTS public.update_load_status_with_validation(uuid, text, text);

-- Create the unified function that matches what the code expects
CREATE OR REPLACE FUNCTION public.update_load_status_with_validation(
  load_id_param UUID,
  new_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  result_load RECORD;
  old_status TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Get the current status before updating
  SELECT status INTO old_status 
  FROM loads 
  WHERE id = load_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Load not found'
    );
  END IF;

  -- Update the load status
  UPDATE loads 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = load_id_param
  RETURNING * INTO result_load;

  -- Insert status history record (the trigger will handle this, but we want to make sure)
  -- The trigger should automatically create the history entry
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Load status updated successfully',
    'load_id', load_id_param,
    'old_status', old_status,
    'new_status', new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;