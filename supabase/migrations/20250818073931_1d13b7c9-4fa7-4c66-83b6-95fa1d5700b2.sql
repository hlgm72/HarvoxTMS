-- Fix security warnings by setting proper search_path for functions

-- Fix log_load_status_change function
CREATE OR REPLACE FUNCTION public.log_load_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert if status actually changed
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

-- Fix log_load_status_change_safe function
CREATE OR REPLACE FUNCTION public.log_load_status_change_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Only insert if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get current user, use system user if none authenticated
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
      current_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
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
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't prevent the update
  RAISE WARNING 'Error logging status change: %', SQLERRM;
  RETURN NEW;
END;
$$;