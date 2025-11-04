
-- Corregir el search_path de la función temporal
CREATE OR REPLACE FUNCTION fix_load_472_period_assignment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_load_id uuid;
  v_old_period_id uuid;
  v_new_period_id uuid;
  v_driver_id uuid;
  v_payroll_id uuid;
BEGIN
  -- Obtener datos de la carga
  SELECT id, payment_period_id, driver_user_id
  INTO v_load_id, v_old_period_id, v_driver_id
  FROM loads
  WHERE load_number = '25-472'
  LIMIT 1;

  IF v_load_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Load 25-472 not found');
  END IF;

  -- El período correcto es 1c854e52-ba38-45c0-9cd4-8ae14532ffc9 (27 oct - 2 nov)
  v_new_period_id := '1c854e52-ba38-45c0-9cd4-8ae14532ffc9';

  RAISE LOG 'Fixing load 472: % -> %', v_old_period_id, v_new_period_id;

  -- Actualizar la carga con el período correcto
  UPDATE loads
  SET payment_period_id = v_new_period_id,
      updated_at = now()
  WHERE id = v_load_id;

  -- Obtener el user_payroll del conductor para este período
  SELECT id INTO v_payroll_id
  FROM user_payrolls
  WHERE user_id = v_driver_id
    AND company_payment_period_id = v_new_period_id
  LIMIT 1;

  IF v_payroll_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User payroll not found for driver in week 44'
    );
  END IF;

  -- Recalcular el período del usuario
  PERFORM calculate_driver_payment_period_v2(v_payroll_id);

  -- También recalcular el período viejo si existe
  IF v_old_period_id IS NOT NULL AND v_old_period_id != v_new_period_id THEN
    SELECT id INTO v_payroll_id
    FROM user_payrolls
    WHERE user_id = v_driver_id
      AND company_payment_period_id = v_old_period_id
    LIMIT 1;
    
    IF v_payroll_id IS NOT NULL THEN
      PERFORM calculate_driver_payment_period_v2(v_payroll_id);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'load_id', v_load_id,
    'old_period', v_old_period_id,
    'new_period', v_new_period_id,
    'message', 'Load 472 reassigned and payrolls recalculated'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
