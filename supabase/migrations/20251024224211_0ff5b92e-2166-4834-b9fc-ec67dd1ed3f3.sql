
-- Corregir la función para que no use el campo 'description' que no existe
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
    RAISE NOTICE 'recalculate_period_percentage_deductions: target_period_id is NULL, skipping';
    RETURN;
  END IF;
  
  SELECT 
    EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_period_id),
    (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id LIMIT 1)
  INTO v_period_exists, v_period_start_date;
  
  IF NOT v_period_exists THEN
    RAISE NOTICE 'recalculate_period_percentage_deductions: Period % does not exist', target_period_id;
    RETURN;
  END IF;

  -- Limpiar deducciones existentes
  DELETE FROM expense_instances
  WHERE user_id = target_user_id
    AND expense_type_id IN (v_factoring_type_id, v_dispatching_type_id, v_leasing_type_id)
    AND (payment_period_id = target_period_id OR payment_period_id IS NULL);
  
  RAISE LOG 'Limpiadas deducciones de porcentaje para user % en periodo %', target_user_id, target_period_id;
  
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
  
  RAISE LOG 'Totales calculados: factoring=%, dispatching=%, leasing=%', 
    v_factoring_total, v_dispatching_total, v_leasing_total;
  
  -- Insertar factoring
  IF v_factoring_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      payment_period_id, status, created_by
    ) VALUES (
      target_user_id, v_factoring_type_id, v_factoring_total,
      v_period_start_date, target_period_id, 'planned', auth.uid()
    );
    RAISE LOG 'Insertado factoring: $%', v_factoring_total;
  END IF;
  
  -- Insertar dispatching
  IF v_dispatching_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      payment_period_id, status, created_by
    ) VALUES (
      target_user_id, v_dispatching_type_id, v_dispatching_total,
      v_period_start_date, target_period_id, 'planned', auth.uid()
    );
    RAISE LOG 'Insertado dispatching: $%', v_dispatching_total;
  END IF;
  
  -- Insertar leasing
  IF v_leasing_total > 0 THEN
    INSERT INTO expense_instances (
      user_id, expense_type_id, amount, expense_date,
      payment_period_id, status, created_by
    ) VALUES (
      target_user_id, v_leasing_type_id, v_leasing_total,
      v_period_start_date, target_period_id, 'planned', auth.uid()
    );
    RAISE LOG 'Insertado leasing: $%', v_leasing_total;
  END IF;

  RAISE LOG '✅ Completado recalculate_period_percentage_deductions para user % en periodo %',
    target_user_id, target_period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ ERROR en recalculate_period_percentage_deductions: %', SQLERRM;
END;
$$;

-- Ejecutar de nuevo
SELECT recalculate_period_percentage_deductions(
  'becd3770-526a-41cc-8e1e-eb35764c90ac',
  '087a825c-94ea-42d9-8388-5087a19d776f'
);

-- Recalcular payroll
SELECT force_recalculate_period('becd3770-526a-41cc-8e1e-eb35764c90ac');
