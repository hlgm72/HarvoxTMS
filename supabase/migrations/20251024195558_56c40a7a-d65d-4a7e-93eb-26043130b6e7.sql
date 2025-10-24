
-- Función para eliminar transacciones de combustible duplicadas de forma segura
CREATE OR REPLACE FUNCTION delete_duplicate_fuel_transactions(transaction_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count integer := 0;
  v_affected_payroll_ids uuid[];
  v_result json;
BEGIN
  -- Obtener los user_payroll_ids afectados antes de eliminar
  SELECT array_agg(DISTINCT payment_period_id)
  INTO v_affected_payroll_ids
  FROM fuel_expenses
  WHERE id = ANY(transaction_ids);

  -- Eliminar las transacciones
  DELETE FROM fuel_expenses
  WHERE id = ANY(transaction_ids)
  RETURNING * INTO v_deleted_count;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Recalcular los períodos afectados
  IF v_affected_payroll_ids IS NOT NULL THEN
    FOR i IN 1..array_length(v_affected_payroll_ids, 1) LOOP
      -- Obtener el user_payroll_id correspondiente y recalcular
      DECLARE
        v_payroll_id uuid;
      BEGIN
        SELECT id INTO v_payroll_id
        FROM user_payrolls
        WHERE company_payment_period_id = v_affected_payroll_ids[i]
        LIMIT 1;
        
        IF v_payroll_id IS NOT NULL THEN
          PERFORM calculate_user_payment_period_with_validation(v_payroll_id);
        END IF;
      END;
    END LOOP;
  END IF;

  v_result := json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'affected_periods', v_affected_payroll_ids
  );

  RETURN v_result;
END;
$$;
