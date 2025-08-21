-- Function to clean up expense instances with old description format
CREATE OR REPLACE FUNCTION public.cleanup_old_recurring_expense_descriptions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete expense instances that have the old generic description
  DELETE FROM expense_instances 
  WHERE description = 'Recurring expense from template'
  AND recurring_template_id IS NOT NULL
  AND status = 'planned';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Eliminadas %s deducciones con descripción antigua', deleted_count),
    'deleted_count', deleted_count
  );
END;
$function$;

-- Execute the cleanup function
SELECT public.cleanup_old_recurring_expense_descriptions();