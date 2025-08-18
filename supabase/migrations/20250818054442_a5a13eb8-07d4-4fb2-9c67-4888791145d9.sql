-- Fix security warning: set immutable search_path for log_load_status_change function
CREATE OR REPLACE FUNCTION public.log_load_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
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
$$;