-- Fix: Bypass RLS for SECURITY DEFINER function by using DELETE with proper context

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
  v_expense_instances_deleted INTEGER := 0;
  v_fuel_deleted INTEGER := 0;
  v_income_deleted INTEGER := 0;
BEGIN
  -- Get load with all necessary info
  SELECT * INTO load_record
  FROM loads
  WHERE id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Store IDs before deletion
  user_payroll_id := load_record.payment_period_id;

  -- Get the company period ID from user_payrolls
  IF user_payroll_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO company_period_id
    FROM user_payrolls
    WHERE id = user_payroll_id;
  END IF;

  -- 1. Delete all related records first
  DELETE FROM load_stops WHERE load_id = load_id_param;
  DELETE FROM load_documents WHERE load_id = load_id_param;
  DELETE FROM load_status_history WHERE load_id = load_id_param;

  -- 2. Delete the load itself
  DELETE FROM loads WHERE id = load_id_param;

  -- 3. Check if the user's payroll is now empty
  IF user_payroll_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM loads 
      WHERE payment_period_id = user_payroll_id
    ) AND NOT EXISTS (
      SELECT 1 FROM fuel_expenses 
      WHERE payment_period_id = user_payroll_id
    ) AND NOT EXISTS (
      SELECT 1 FROM other_income 
      WHERE payment_period_id = user_payroll_id
    ) THEN
      -- User payroll is empty, delete it
      DELETE FROM user_payrolls WHERE id = user_payroll_id;
      v_payroll_deleted := TRUE;

      -- 4. Check if the company period now has NO user payrolls left
      IF company_period_id IS NOT NULL THEN
        SELECT EXISTS(
          SELECT 1 FROM user_payrolls 
          WHERE company_payment_period_id = company_period_id
        ) INTO period_has_any_payrolls;

        -- If NO payrolls left, delete ALL related data
        IF NOT period_has_any_payrolls THEN
          -- CRITICAL: Bypass RLS by using direct SQL with explicit WHERE clause
          -- This function runs as SECURITY DEFINER so we have permission
          
          -- Delete expense_instances - NO RLS check needed in SECURITY DEFINER context
          EXECUTE format('DELETE FROM expense_instances WHERE payment_period_id = %L', company_period_id);
          GET DIAGNOSTICS v_expense_instances_deleted = ROW_COUNT;

          -- Delete fuel_expenses
          EXECUTE format('DELETE FROM fuel_expenses WHERE payment_period_id = %L', company_period_id);
          GET DIAGNOSTICS v_fuel_deleted = ROW_COUNT;

          -- Delete other_income
          EXECUTE format('DELETE FROM other_income WHERE payment_period_id = %L', company_period_id);
          GET DIAGNOSTICS v_income_deleted = ROW_COUNT;

          -- Now safe to delete company period
          DELETE FROM company_payment_periods WHERE id = company_period_id;
          v_period_deleted := TRUE;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Return success with debug info
  RETURN jsonb_build_object(
    'success', TRUE,
    'load_id', load_id_param,
    'payroll_deleted', v_payroll_deleted,
    'period_deleted', v_period_deleted,
    'expense_instances_deleted', v_expense_instances_deleted,
    'fuel_deleted', v_fuel_deleted,
    'income_deleted', v_income_deleted,
    'company_period_id', company_period_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$$;