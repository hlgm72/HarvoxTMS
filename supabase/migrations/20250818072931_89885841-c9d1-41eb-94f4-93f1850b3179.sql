-- Create the missing update_load_status_with_validation function
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
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Allow system updates when no user is authenticated (for migrations)
  IF current_user_id IS NULL THEN
    current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Update the load status
  UPDATE loads 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = load_id_param
  RETURNING * INTO result_load;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Load not found'
    );
  END IF;

  -- Insert status history record
  INSERT INTO load_status_history (
    load_id,
    old_status,
    new_status,
    changed_by,
    changed_at,
    notes
  ) VALUES (
    load_id_param,
    result_load.status,
    new_status,
    current_user_id,
    now(),
    'Status updated via validation function'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Load status updated successfully',
    'load_id', load_id_param,
    'new_status', new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;