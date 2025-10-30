-- Fix: Usar company_payment_period_id en user_payrolls (no payment_period_id)

CREATE OR REPLACE FUNCTION delete_load_with_validation(load_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  load_record RECORD;
  user_payroll_id UUID;
  company_period_id UUID;
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

  -- Store IDs before deletion
  user_payroll_id := load_record.payment_period_id;  -- This is the user_payroll ID

  -- Get the company period ID from user_payrolls
  -- CRÍTICO: user_payrolls usa company_payment_period_id (no payment_period_id)
  IF user_payroll_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO company_period_id
    FROM user_payrolls
    WHERE id = user_payroll_id;
  END IF;

  -- 1. Delete all related records first (no FK issues here)
  DELETE FROM load_stops WHERE load_id = load_id_param;
  DELETE FROM load_documents WHERE load_id = load_id_param;
  DELETE FROM load_status_history WHERE load_id = load_id_param;

  -- 2. Delete the load itself
  DELETE FROM loads WHERE id = load_id_param;

  -- 3. Check if the user's payroll is now empty (only if it has a payroll)
  IF user_payroll_id IS NOT NULL THEN
    -- Check if this payroll has any other loads, fuel, expense_instances, or income
    IF NOT EXISTS (
      SELECT 1 FROM loads 
      WHERE payment_period_id = user_payroll_id
      AND id != load_id_param
    ) AND NOT EXISTS (
      SELECT 1 FROM fuel_expenses 
      WHERE payment_period_id = user_payroll_id
    ) AND NOT EXISTS (
      SELECT 1 FROM expense_instances 
      WHERE payment_period_id = user_payroll_id
    ) AND NOT EXISTS (
      SELECT 1 FROM other_income 
      WHERE payment_period_id = user_payroll_id
    ) THEN
      -- Payroll is empty, delete it
      
      -- CRITICAL: First delete all expense_instances for this payroll
      DELETE FROM expense_instances
      WHERE user_id = load_record.driver_user_id
      AND payment_period_id = user_payroll_id;

      -- Now safe to delete the payroll
      DELETE FROM user_payrolls WHERE id = user_payroll_id;
      v_payroll_deleted := TRUE;

      -- Check if the company period has any other payrolls left
      -- CRÍTICO: user_payrolls usa company_payment_period_id (no payment_period_id)
      IF company_period_id IS NOT NULL THEN
        SELECT EXISTS(
          SELECT 1 FROM user_payrolls 
          WHERE company_payment_period_id = company_period_id
        ) INTO period_has_any_payrolls;

        -- If no payrolls left, delete the period
        IF NOT period_has_any_payrolls THEN
          -- Delete ALL expense_instances that reference this company period
          DELETE FROM expense_instances
          WHERE payment_period_id = company_period_id;

          -- Delete any fuel_expenses directly referencing the period
          DELETE FROM fuel_expenses
          WHERE payment_period_id = company_period_id;

          -- Delete any other_income directly referencing the period
          DELETE FROM other_income
          WHERE payment_period_id = company_period_id;

          -- Now safe to delete the company period
          DELETE FROM company_payment_periods WHERE id = company_period_id;
          v_period_deleted := TRUE;
        END IF;
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