-- Fix delete_load_with_validation to properly clean up empty periods
-- Previous version only cleaned up if driver_calculation_id was set
-- New version checks if payment_period_id is empty after load deletion

CREATE OR REPLACE FUNCTION delete_load_with_validation(load_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  load_record RECORD;
  v_payment_period_id UUID;
  period_has_any_data BOOLEAN;
  v_period_deleted BOOLEAN := FALSE;
BEGIN
  -- Get load with all necessary info
  SELECT * INTO load_record
  FROM loads
  WHERE id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Store the payment period ID before deletion
  v_payment_period_id := load_record.payment_period_id;

  -- 1. Delete all related records first
  DELETE FROM load_stops WHERE load_id = load_id_param;
  DELETE FROM load_documents WHERE load_id = load_id_param;
  DELETE FROM load_status_history WHERE load_id = load_id_param;

  -- 2. Delete the load itself
  DELETE FROM loads WHERE id = load_id_param;

  -- 3. Check if the payment period is now empty (only if load had a period)
  IF v_payment_period_id IS NOT NULL THEN
    -- Check if this period has ANY data left:
    -- - loads, fuel_expenses, expense_instances, other_income, deductions
    SELECT EXISTS (
      SELECT 1 FROM loads WHERE payment_period_id = v_payment_period_id
      UNION ALL
      SELECT 1 FROM fuel_expenses WHERE payment_period_id = v_payment_period_id
      UNION ALL
      SELECT 1 FROM expense_instances WHERE payment_period_id = v_payment_period_id
      UNION ALL
      SELECT 1 FROM other_income WHERE payment_period_id = v_payment_period_id
      UNION ALL
      SELECT 1 FROM deductions WHERE payment_period_id = v_payment_period_id
    ) INTO period_has_any_data;

    -- If period is completely empty, delete it
    IF NOT period_has_any_data THEN
      -- Delete the empty period
      DELETE FROM company_payment_periods WHERE id = v_payment_period_id;
      v_period_deleted := TRUE;
    END IF;
  END IF;

  -- Return success with flag indicating if period was deleted
  RETURN jsonb_build_object(
    'success', TRUE,
    'load_id', load_id_param,
    'period_deleted', v_period_deleted
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$$;