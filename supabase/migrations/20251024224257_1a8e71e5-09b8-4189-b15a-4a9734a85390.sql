
-- Solo actualizar la función sin ejecutarla aún
CREATE OR REPLACE FUNCTION recalculate_period_percentage_deductions(target_period_id uuid, target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_factoring_total NUMERIC := 0;
  v_dispatching_total NUMERIC := 0;
  v_leasing_total NUMERIC := 0;
  v_factoring_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  v_dispatching_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  v_leasing_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
  v_period_exists BOOLEAN;
  v_period_start_date DATE;
BEGIN
  IF target_period_id IS NULL THEN
    RETURN;
  END IF;
  
  SELECT 
    EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_period_id),
    (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id LIMIT 1)
  INTO v_period_exists, v_period_start_date;
  
  IF NOT v_period_exists THEN
    RETURN;
  END IF;

  -- Limpiar deducciones existentes
  DELETE FROM expense_instances
  WHERE user_id = target_user_id
    AND expense_type_id IN (v_factoring_type_id, v_dispatching_type_id, v_leasing_type_id)
    AND (payment_period_id = target_period_id OR payment_period_id IS NULL);
  
  -- Calcular totales
  SELECT
    COALESCE(SUM(ROUND(total_amount * COALESCE(factoring_percentage, 0) / 100, 2)), 0),
    COALESCE(SUM(ROUND(total_amount * COALESCE(dispatching_percentage, 0) / 100, 2)), 0),
    COALESCE(SUM(ROUND(total_amount * COALESCE(leasing_percentage, 0) / 100, 2)), 0)
  INTO v_factoring_total, v_dispatching_total, v_leasing_total
  FROM loads
  WHERE driver_user_id = target_user_id
    AND payment_period_id = target_period_id
    AND status NOT IN ('cancelled', 'rejected');
  
  -- Insertar deducciones (SIN campo description)
  IF v_factoring_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      payment_period_id, status, created_by
    ) VALUES (
      target_user_id, v_factoring_type_id, v_factoring_total,
      v_period_start_date, target_period_id, 'planned', auth.uid()
    );
  END IF;
  
  IF v_dispatching_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      payment_period_id, status, created_by
    ) VALUES (
      target_user_id, v_dispatching_type_id, v_dispatching_total,
      v_period_start_date, target_period_id, 'planned', auth.uid()
    );
  END IF;
  
  IF v_leasing_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      payment_period_id, status, created_by
    ) VALUES (
      target_user_id, v_leasing_type_id, v_leasing_total,
      v_period_start_date, target_period_id, 'planned', auth.uid()
    );
  END IF;

END;
$$;
