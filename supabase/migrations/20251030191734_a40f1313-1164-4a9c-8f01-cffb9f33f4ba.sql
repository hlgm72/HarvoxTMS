-- Fix delete_load_with_validation to properly handle ALL expense_instances
-- The issue: We need to delete ALL expense_instances referencing the period, not just the driver's

CREATE OR REPLACE FUNCTION delete_load_with_validation(load_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  load_record RECORD;
  driver_calculation_id UUID;
  period_has_any_payrolls BOOLEAN;
  v_payroll_deleted BOOLEAN := FALSE;
  v_period_deleted BOOLEAN := FALSE;
BEGIN
  -- Get load with all necessary info
  SELECT * INTO load_record
  FROM loads
  WHERE id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Store the driver calculation ID before deletion
  driver_calculation_id := load_record.driver_calculation_id;

  -- 1. Delete all related records first (no FK issues here)
  DELETE FROM load_stops WHERE load_id = load_id_param;
  DELETE FROM load_documents WHERE load_id = load_id_param;
  DELETE FROM load_status_history WHERE load_id = load_id_param;

  -- 2. Delete the load itself
  DELETE FROM loads WHERE id = load_id_param;

  -- 3. Check if the driver's payroll is now empty (only if it has a payroll)
  IF driver_calculation_id IS NOT NULL THEN
    -- Check if this payroll has any other loads, fuel, deductions, or income
    IF NOT EXISTS (
      SELECT 1 FROM loads 
      WHERE driver_calculation_id = driver_calculation_id
      AND id != load_id_param
    ) AND NOT EXISTS (
      SELECT 1 FROM fuel_expenses 
      WHERE driver_calculation_id = driver_calculation_id
    ) AND NOT EXISTS (
      SELECT 1 FROM deductions 
      WHERE driver_calculation_id = driver_calculation_id
    ) AND NOT EXISTS (
      SELECT 1 FROM other_income 
      WHERE driver_calculation_id = driver_calculation_id
    ) THEN
      -- Payroll is empty, delete it
      
      -- CRITICAL: First delete all expense_instances for this driver in this period
      DELETE FROM expense_instances
      WHERE user_id = load_record.driver_user_id
      AND payment_period_id = driver_calculation_id;

      -- Now safe to delete the payroll
      DELETE FROM user_payrolls WHERE id = driver_calculation_id;
      v_payroll_deleted := TRUE;

      -- Check if the period has any other payrolls left
      SELECT EXISTS(
        SELECT 1 FROM user_payrolls 
        WHERE payment_period_id = load_record.payment_period_id
      ) INTO period_has_any_payrolls;

      -- If no payrolls left, delete the period
      IF NOT period_has_any_payrolls THEN
        -- FIXED: Delete ALL expense_instances that reference this period
        -- This includes instances from ALL drivers, not just the current one
        -- Because expense_instances.payment_period_id can reference company_payment_periods.id
        DELETE FROM expense_instances
        WHERE payment_period_id = load_record.payment_period_id;

        -- Also delete any fuel_expenses directly referencing the period
        DELETE FROM fuel_expenses
        WHERE payment_period_id = load_record.payment_period_id;

        -- Delete any other_income directly referencing the period
        DELETE FROM other_income
        WHERE payment_period_id = load_record.payment_period_id;

        -- Delete any deductions directly referencing the period
        DELETE FROM deductions
        WHERE payment_period_id = load_record.payment_period_id;

        -- Now safe to delete the period
        DELETE FROM company_payment_periods WHERE id = load_record.payment_period_id;
        v_period_deleted := TRUE;
      END IF;
    END IF;
  END IF;

  -- Return success with flags indicating what was deleted
  RETURN jsonb_build_object(
    'success', TRUE,
    'load_id', load_id_param,
    'payroll_deleted', v_payroll_deleted,
    'period_deleted', v_period_deleted
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$$;