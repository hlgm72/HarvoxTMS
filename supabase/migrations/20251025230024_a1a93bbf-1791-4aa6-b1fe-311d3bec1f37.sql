-- Function to validate if a facility can be deleted or needs to be inactivated
CREATE OR REPLACE FUNCTION validate_facility_deletion(facility_id_param UUID)
RETURNS jsonb AS $$
DECLARE
  load_stops_count INTEGER;
  result jsonb;
BEGIN
  -- Count how many load_stops reference this facility
  SELECT COUNT(*) INTO load_stops_count
  FROM load_stops
  WHERE facility_id = facility_id_param;
  
  -- Return the result
  IF load_stops_count > 0 THEN
    result := jsonb_build_object(
      'can_delete', false,
      'is_in_use', true,
      'load_stops_count', load_stops_count,
      'message', 'This facility is associated with ' || load_stops_count || ' load stop(s) and cannot be deleted.'
    );
  ELSE
    result := jsonb_build_object(
      'can_delete', true,
      'is_in_use', false,
      'load_stops_count', 0,
      'message', 'This facility can be safely deleted.'
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;