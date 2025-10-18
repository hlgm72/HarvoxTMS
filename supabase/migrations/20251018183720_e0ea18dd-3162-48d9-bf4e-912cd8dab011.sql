-- ========================================
-- FIX CRÍTICO: Eliminar deducciones huérfanas y prevenir futuros conflictos
-- ========================================

-- 1. LIMPIEZA ÚNICA: Eliminar TODAS las deducciones huérfanas de porcentaje
DELETE FROM expense_instances
WHERE payment_period_id IS NULL
  AND expense_type_id IN (
    '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb', -- factoring
    '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10', -- dispatching
    '28d59af7-c756-40bf-885e-fb995a744003'  -- leasing
  );

-- 2. ACTUALIZAR FUNCIÓN: Limpiar también huérfanas antes de insertar
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
  v_period_start_date DATE;
BEGIN
  -- 🚨 CRÍTICO: Validar que el período existe Y obtener su fecha de inicio
  SELECT 
    EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_period_id),
    (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id LIMIT 1)
  INTO v_period_exists, v_period_start_date;
  
  IF NOT v_period_exists OR target_period_id IS NULL THEN
    RAISE NOTICE 'recalculate_period_percentage_deductions: Period % does not exist or is NULL, skipping all operations', target_period_id;
    RETURN; -- Salir inmediatamente si el período no existe o es NULL
  END IF;

  -- 🚨 CRÍTICO: Limpiar deducciones del período Y huérfanas del usuario
  DELETE FROM expense_instances
  WHERE user_id = target_user_id
    AND expense_type_id IN (v_factoring_type_id, v_dispatching_type_id, v_leasing_type_id)
    AND (payment_period_id = target_period_id OR payment_period_id IS NULL);
  
  RAISE LOG 'Cleaned up percentage deductions (including orphans) for user % in period %', 
    target_user_id, target_period_id;
  
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
      v_period_start_date,
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
      v_period_start_date,
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
      v_period_start_date,
      get_period_description(target_period_id, 'Leasing fee'),
      target_period_id, auth.uid()
    );
  END IF;
  
  RAISE LOG 'recalculate_period_percentage_deductions: Completed for period % and user %. Factoring: %, Dispatching: %, Leasing: %',
    target_period_id, target_user_id, v_factoring_total, v_dispatching_total, v_leasing_total;
    
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE WARNING 'recalculate_period_percentage_deductions: Foreign key violation for period %. Period may have been deleted. Skipping insert.', target_period_id;
    RETURN;
  WHEN OTHERS THEN
    RAISE WARNING 'recalculate_period_percentage_deductions: Unexpected error for period %: %', target_period_id, SQLERRM;
    RETURN;
END;
$function$;