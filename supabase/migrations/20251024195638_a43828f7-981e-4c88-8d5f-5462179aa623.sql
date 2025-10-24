
-- Corregir función para eliminar transacciones duplicadas
CREATE OR REPLACE FUNCTION delete_duplicate_fuel_transactions(transaction_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count integer := 0;
  v_affected_period_id uuid;
  v_payroll_id uuid;
  v_result json;
BEGIN
  -- Obtener el payment_period_id afectado
  SELECT DISTINCT payment_period_id
  INTO v_affected_period_id
  FROM fuel_expenses
  WHERE id = ANY(transaction_ids)
  LIMIT 1;

  -- Eliminar las transacciones
  DELETE FROM fuel_expenses
  WHERE id = ANY(transaction_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Recalcular el período afectado
  IF v_affected_period_id IS NOT NULL THEN
    SELECT id INTO v_payroll_id
    FROM user_payrolls
    WHERE company_payment_period_id = v_affected_period_id
    LIMIT 1;
    
    IF v_payroll_id IS NOT NULL THEN
      PERFORM calculate_user_payment_period_with_validation(v_payroll_id);
    END IF;
  END IF;

  v_result := json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'affected_period', v_affected_period_id,
    'recalculated_payroll', v_payroll_id
  );

  RETURN v_result;
END;
$$;
