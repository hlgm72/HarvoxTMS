
-- Script para desmarcar payrolls como pagados y revertir transacciones
-- Este script permite hacer rollback de un pago para testing

-- Función auxiliar para desmarcar un payroll como pagado
CREATE OR REPLACE FUNCTION unmark_driver_as_paid(
  p_payroll_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_reverted_loads INTEGER := 0;
  v_reverted_fuel INTEGER := 0;
  v_reverted_income INTEGER := 0;
  v_reverted_expenses INTEGER := 0;
BEGIN
  -- Obtener información del payroll
  SELECT user_id, company_payment_period_id 
  INTO v_user_id, v_period_id
  FROM user_payrolls 
  WHERE id = p_payroll_id
    AND payment_status = 'paid';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'PAYROLL_NOT_FOUND_OR_NOT_PAID'
    );
  END IF;

  -- PASO 1: Revertir transacciones de 'applied' a sus estados anteriores
  
  -- 1.1 Revertir loads de 'applied' a 'pending'
  UPDATE loads
  SET 
    payment_status = 'pending',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status = 'applied';
  
  GET DIAGNOSTICS v_reverted_loads = ROW_COUNT;

  -- 1.2 Revertir fuel_expenses de 'applied' a 'pending'
  UPDATE fuel_expenses
  SET 
    status = 'pending',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status = 'applied';

  GET DIAGNOSTICS v_reverted_fuel = ROW_COUNT;

  -- 1.3 Revertir other_income de 'applied' a 'pending'
  UPDATE other_income
  SET 
    status = 'pending',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status = 'applied';

  GET DIAGNOSTICS v_reverted_income = ROW_COUNT;

  -- 1.4 Revertir expense_instances de 'applied' a 'planned'
  UPDATE expense_instances
  SET 
    status = 'planned',
    updated_at = now()
  WHERE user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status = 'applied';

  GET DIAGNOSTICS v_reverted_expenses = ROW_COUNT;

  -- PASO 2: Desmarcar el payroll como no pagado
  UPDATE user_payrolls
  SET 
    payment_status = 'calculated',
    payment_date = NULL,
    payment_method = NULL,
    payment_reference = NULL,
    payment_notes = NULL,
    updated_at = now()
  WHERE id = p_payroll_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'PAYMENT_REVERTED',
    'reverted_loads', v_reverted_loads,
    'reverted_fuel', v_reverted_fuel,
    'reverted_income', v_reverted_income,
    'reverted_expenses', v_reverted_expenses
  );
END;
$$;

COMMENT ON FUNCTION unmark_driver_as_paid IS 
  'Función para desmarcar un payroll como pagado y revertir todas las transacciones relacionadas. Útil para testing y corrección de errores.';
