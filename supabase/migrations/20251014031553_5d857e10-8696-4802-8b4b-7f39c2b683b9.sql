
-- ========================================
-- FIX: Validar que el período existe antes de insertar deducciones
-- ========================================

CREATE OR REPLACE FUNCTION public.recalculate_period_percentage_deductions(target_period_id uuid, target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_factoring_total NUMERIC := 0;
  v_dispatching_total NUMERIC := 0;
  v_leasing_total NUMERIC := 0;
  v_factoring_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  v_dispatching_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  v_leasing_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
  v_period_exists BOOLEAN;
BEGIN
  -- 🚨 VALIDAR que el período existe antes de proceder
  SELECT EXISTS(
    SELECT 1 FROM company_payment_periods WHERE id = target_period_id
  ) INTO v_period_exists;
  
  IF NOT v_period_exists THEN
    RAISE NOTICE 'recalculate_period_percentage_deductions: Period % does not exist, skipping', target_period_id;
    RETURN; -- Salir silenciosamente si el período no existe
  END IF;

  -- Limpiar deducciones existentes para este período y usuario
  DELETE FROM expense_instances
  WHERE payment_period_id = target_period_id
    AND user_id = target_user_id
    AND expense_type_id IN (v_factoring_type_id, v_dispatching_type_id, v_leasing_type_id);
  
  -- Calcular totales de deducciones
  SELECT
    COALESCE(SUM(ROUND(total_amount * COALESCE(factoring_percentage, 0) / 100, 2)), 0),
    COALESCE(SUM(ROUND(total_amount * COALESCE(dispatching_percentage, 0) / 100, 2)), 0),
    COALESCE(SUM(ROUND(total_amount * COALESCE(leasing_percentage, 0) / 100, 2)), 0)
  INTO v_factoring_total, v_dispatching_total, v_leasing_total
  FROM loads
  WHERE driver_user_id = target_user_id
    AND payment_period_id = target_period_id
    AND status != 'cancelled';
  
  -- Insertar deducciones solo si hay montos > 0
  IF v_factoring_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      description, payment_period_id, created_by
    ) VALUES (
      target_user_id, v_factoring_type_id, v_factoring_total,
      (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id),
      get_period_description(target_period_id, 'Factoring fee'),
      target_period_id, auth.uid()
    );
  END IF;
  
  IF v_dispatching_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      description, payment_period_id, created_by
    ) VALUES (
      target_user_id, v_dispatching_type_id, v_dispatching_total,
      (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id),
      get_period_description(target_period_id, 'Dispatching fee'),
      target_period_id, auth.uid()
    );
  END IF;
  
  IF v_leasing_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      description, payment_period_id, created_by
    ) VALUES (
      target_user_id, v_leasing_type_id, v_leasing_total,
      (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id),
      get_period_description(target_period_id, 'Leasing fee'),
      target_period_id, auth.uid()
    );
  END IF;
  
  RAISE LOG 'recalculate_period_percentage_deductions: Recalculated deductions for period % and user %. Factoring: %, Dispatching: %, Leasing: %',
    target_period_id, target_user_id, v_factoring_total, v_dispatching_total, v_leasing_total;
END;
$function$;
