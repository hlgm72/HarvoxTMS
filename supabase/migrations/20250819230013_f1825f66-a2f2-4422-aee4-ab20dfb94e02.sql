-- Función corregida para eliminar gastos de combustible que maneja ambos casos
CREATE OR REPLACE FUNCTION delete_fuel_expense_with_validation(expense_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment_period_id uuid; -- Este puede ser driver_period_calculations.id O company_payment_periods.id
  v_company_id uuid;
  v_is_locked boolean;
  v_has_access boolean;
  v_cpp_id uuid; -- company_payment_periods.id
  v_driver_period_id uuid; -- driver_period_calculations.id
  v_driver_user_id uuid;
BEGIN
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Load expense payment period id and driver
  SELECT payment_period_id, driver_user_id INTO v_payment_period_id, v_driver_user_id 
  FROM fuel_expenses 
  WHERE id = expense_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Gasto de combustible no encontrado');
  END IF;

  -- Determinar si payment_period_id es un driver_period_calculation o company_payment_period
  -- Primero intentar como driver_period_calculation
  SELECT cpp.company_id, cpp.is_locked, cpp.id, dpc.id
  INTO v_company_id, v_is_locked, v_cpp_id, v_driver_period_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
  WHERE dpc.id = v_payment_period_id;

  -- Si no se encontró, intentar como company_payment_period directamente
  IF NOT FOUND THEN
    SELECT cpp.company_id, cpp.is_locked, cpp.id
    INTO v_company_id, v_is_locked, v_cpp_id
    FROM company_payment_periods cpp
    WHERE cpp.id = v_payment_period_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Período relacionado no encontrado');
    END IF;
    
    -- Buscar el driver_period_calculation correspondiente
    SELECT id INTO v_driver_period_id
    FROM driver_period_calculations
    WHERE company_payment_period_id = v_cpp_id 
    AND driver_user_id = v_driver_user_id;
  END IF;

  -- Check access: same company membership OR is the driver who owns the expense
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = v_company_id
      AND ucr.is_active = true
  ) OR (auth.uid() = v_driver_user_id) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN jsonb_build_object('success', false, 'message', 'No tienes permisos para eliminar este gasto');
  END IF;

  -- Check lock
  IF v_is_locked OR is_period_locked(v_cpp_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período está cerrado; no se puede eliminar');
  END IF;

  -- Delete
  DELETE FROM fuel_expenses WHERE id = expense_id;

  -- Recalculate if we have a driver period calculation
  IF v_driver_period_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(v_driver_period_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gasto eliminado exitosamente',
    'expense_id', expense_id,
    'payment_period_id', v_payment_period_id,
    'driver_period_calculation_id', v_driver_period_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error eliminando gasto de combustible: %', SQLERRM;
END;
$$;