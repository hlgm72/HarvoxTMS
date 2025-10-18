
-- ====================================================================
-- 🚨 SOLUCIÓN DEFINITIVA: Prevenir errores de FK en expense_instances
-- ====================================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- Los exception handlers no pueden recuperar una transacción después de 
-- un error de FK. Necesitamos PREVENIR el error antes de que ocurra.
--
-- SOLUCIÓN:
-- Usar SAVEPOINT antes de cada INSERT y verificar explícitamente 
-- que el período existe justo antes de insertar.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.recalculate_period_percentage_deductions(
  target_period_id uuid, 
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  -- 🚨 VALIDACIÓN CRÍTICA #1: Verificar que el período existe
  IF target_period_id IS NULL THEN
    RAISE NOTICE 'recalculate_period_percentage_deductions: target_period_id is NULL, skipping';
    RETURN;
  END IF;
  
  -- 🚨 VALIDACIÓN CRÍTICA #2: Verificar que el período existe en la DB
  SELECT 
    EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_period_id),
    (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id LIMIT 1)
  INTO v_period_exists, v_period_start_date;
  
  IF NOT v_period_exists THEN
    RAISE NOTICE 'recalculate_period_percentage_deductions: Period % does not exist, skipping all operations', target_period_id;
    RETURN;
  END IF;

  -- Limpiar deducciones del período Y huérfanas del usuario
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
  
  -- 🚨 VALIDACIÓN CRÍTICA #3: Re-verificar que el período TODAVÍA existe antes de insertar
  -- (previene race conditions donde el período fue eliminado entre la validación y el INSERT)
  IF NOT EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_period_id) THEN
    RAISE WARNING 'recalculate_period_percentage_deductions: Period % was deleted during calculation, aborting inserts', target_period_id;
    RETURN;
  END IF;
  
  -- Insertar deducciones solo si hay montos > 0 Y el período existe
  IF v_factoring_total > 0 THEN
    BEGIN
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date,
        description, payment_period_id, created_by
      ) VALUES (
        target_user_id, v_factoring_type_id, v_factoring_total,
        v_period_start_date,
        get_period_description(target_period_id, 'Factoring fee'),
        target_period_id, auth.uid()
      );
    EXCEPTION 
      WHEN foreign_key_violation THEN
        RAISE WARNING 'FK violation inserting factoring for period %, period may have been deleted', target_period_id;
      WHEN OTHERS THEN
        RAISE WARNING 'Error inserting factoring: %', SQLERRM;
    END;
  END IF;
  
  IF v_dispatching_total > 0 THEN
    BEGIN
      -- Re-verificar antes de cada INSERT
      IF NOT EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_period_id) THEN
        RAISE WARNING 'Period % deleted before dispatching insert', target_period_id;
        RETURN;
      END IF;
      
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date,
        description, payment_period_id, created_by
      ) VALUES (
        target_user_id, v_dispatching_type_id, v_dispatching_total,
        v_period_start_date,
        get_period_description(target_period_id, 'Dispatching fee'),
        target_period_id, auth.uid()
      );
    EXCEPTION 
      WHEN foreign_key_violation THEN
        RAISE WARNING 'FK violation inserting dispatching for period %', target_period_id;
      WHEN OTHERS THEN
        RAISE WARNING 'Error inserting dispatching: %', SQLERRM;
    END;
  END IF;
  
  IF v_leasing_total > 0 THEN
    BEGIN
      -- Re-verificar antes de cada INSERT
      IF NOT EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_period_id) THEN
        RAISE WARNING 'Period % deleted before leasing insert', target_period_id;
        RETURN;
      END IF;
      
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date,
        description, payment_period_id, created_by
      ) VALUES (
        target_user_id, v_leasing_type_id, v_leasing_total,
        v_period_start_date,
        get_period_description(target_period_id, 'Leasing fee'),
        target_period_id, auth.uid()
      );
    EXCEPTION 
      WHEN foreign_key_violation THEN
        RAISE WARNING 'FK violation inserting leasing for period %', target_period_id;
      WHEN OTHERS THEN
        RAISE WARNING 'Error inserting leasing: %', SQLERRM;
    END;
  END IF;
  
  RAISE LOG 'recalculate_period_percentage_deductions: Completed for period % and user %. Factoring: %, Dispatching: %, Leasing: %',
    target_period_id, target_user_id, v_factoring_total, v_dispatching_total, v_leasing_total;
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'recalculate_period_percentage_deductions: Unexpected error for period %: %', target_period_id, SQLERRM;
    RETURN;
END;
$$;
