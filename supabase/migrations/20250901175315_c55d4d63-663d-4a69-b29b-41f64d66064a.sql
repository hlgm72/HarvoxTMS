-- Update existing expense instances with Spanish titles to English
CREATE OR REPLACE FUNCTION public.update_existing_spanish_deduction_titles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  records_updated INTEGER := 0;
  factoring_updated INTEGER := 0;
  leasing_updated INTEGER := 0;
  dispatching_updated INTEGER := 0;
  recurring_updated INTEGER := 0;
  restored_updated INTEGER := 0;
BEGIN
  -- Update Factoring deductions
  UPDATE expense_instances
  SET description = 'Factoring fees'
  WHERE description LIKE '%Deducción automática por Factoring%'
  OR description LIKE '%Factoring (%'
  OR description = 'Deducción automática por Factoring';
  
  GET DIAGNOSTICS factoring_updated = ROW_COUNT;

  -- Update Leasing deductions  
  UPDATE expense_instances
  SET description = 'Leasing fees'
  WHERE description LIKE '%Deducción automática por Leasing%'
  OR description LIKE '%Leasing (%'
  OR description = 'Deducción automática por Leasing';
  
  GET DIAGNOSTICS leasing_updated = ROW_COUNT;

  -- Update Dispatching deductions
  UPDATE expense_instances
  SET description = 'Dispatching fees'
  WHERE description LIKE '%Deducción automática por Dispatching%'
  OR description LIKE '%Dispatching (%'
  OR description = 'Deducción automática por Dispatching';
  
  GET DIAGNOSTICS dispatching_updated = ROW_COUNT;

  -- Update recurring deductions
  UPDATE expense_instances
  SET description = 'Recurring deduction'
  WHERE description = 'Deducción recurrente';
  
  GET DIAGNOSTICS recurring_updated = ROW_COUNT;

  -- Update restored deductions
  UPDATE expense_instances
  SET description = 'Restored deduction'
  WHERE description = 'Deducción restaurada';
  
  GET DIAGNOSTICS restored_updated = ROW_COUNT;

  records_updated := factoring_updated + leasing_updated + dispatching_updated + recurring_updated + restored_updated;

  RETURN jsonb_build_object(
    'success', true,
    'total_updated', records_updated,
    'factoring_updated', factoring_updated,
    'leasing_updated', leasing_updated,
    'dispatching_updated', dispatching_updated,
    'recurring_updated', recurring_updated,
    'restored_updated', restored_updated,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error updating deduction titles: %', SQLERRM;
END;
$function$;