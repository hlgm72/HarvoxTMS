
-- ============================================
-- 🔒 CORRECCIÓN DE SEGURIDAD: Configurar search_path en funciones
-- ============================================

DROP FUNCTION IF EXISTS public.mark_driver_as_paid_with_validation(UUID, TEXT, TEXT, TEXT);

CREATE FUNCTION public.mark_driver_as_paid_with_validation(
  p_calculation_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_payment_date DATE;
  v_result JSONB;
  v_updated_loads INTEGER;
  v_updated_fuel INTEGER;
BEGIN
  SELECT user_id, company_payment_period_id 
  INTO v_user_id, v_period_id
  FROM user_payrolls 
  WHERE id = p_calculation_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CALCULATION_NOT_FOUND'
    );
  END IF;

  v_payment_date := CURRENT_DATE;

  -- Actualizar el payroll
  UPDATE user_payrolls
  SET 
    payment_status = 'paid',
    payment_date = v_payment_date,
    payment_method = p_payment_method,
    payment_reference = p_payment_reference,
    payment_notes = p_notes,
    updated_at = now()
  WHERE id = p_calculation_id
    AND payment_status != 'paid';

  -- Marcar loads como 'applied' (tanto 'pending' como 'approved')
  UPDATE loads
  SET 
    payment_status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_loads = ROW_COUNT;

  -- Marcar fuel_expenses como 'applied'
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS v_updated_fuel = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_loads', v_updated_loads,
    'updated_fuel', v_updated_fuel
  );
END;
$$;

DROP FUNCTION IF EXISTS public.mark_multiple_drivers_as_paid_with_validation(UUID[], TEXT, TEXT, TEXT);

CREATE FUNCTION public.mark_multiple_drivers_as_paid_with_validation(
  p_calculation_ids UUID[],
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calc_id UUID;
  v_result JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_total_loads INTEGER := 0;
  v_total_fuel INTEGER := 0;
  v_results JSONB[] := ARRAY[]::JSONB[];
BEGIN
  FOREACH v_calc_id IN ARRAY p_calculation_ids
  LOOP
    BEGIN
      v_result := mark_driver_as_paid_with_validation(
        v_calc_id,
        p_payment_method,
        p_payment_reference,
        p_notes
      );
      
      IF (v_result->>'success')::BOOLEAN THEN
        v_success_count := v_success_count + 1;
        v_total_loads := v_total_loads + COALESCE((v_result->>'updated_loads')::INTEGER, 0);
        v_total_fuel := v_total_fuel + COALESCE((v_result->>'updated_fuel')::INTEGER, 0);
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
      
      v_results := array_append(v_results, v_result);
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_results := array_append(
        v_results,
        jsonb_build_object(
          'success', false,
          'calculation_id', v_calc_id,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', v_error_count = 0,
    'total_processed', array_length(p_calculation_ids, 1),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'total_loads_updated', v_total_loads,
    'total_fuel_updated', v_total_fuel,
    'results', v_results
  );
END;
$$;
