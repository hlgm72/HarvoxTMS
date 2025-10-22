-- Agregar campo payment_status a loads para gestionar inmutabilidad financiera
-- Similar a fuel_expenses: pending → approved → applied (inmutable)

-- 1. Agregar la columna payment_status
ALTER TABLE loads 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

-- 2. Crear constraint para valores válidos
ALTER TABLE loads 
ADD CONSTRAINT loads_payment_status_check 
CHECK (payment_status IN ('pending', 'approved', 'applied', 'disputed', 'rejected'));

-- 3. Crear índice para mejorar queries por payment_status
CREATE INDEX IF NOT EXISTS idx_loads_payment_status ON loads(payment_status);

-- 4. Crear índice compuesto para queries de período + payment_status
CREATE INDEX IF NOT EXISTS idx_loads_period_payment_status 
ON loads(payment_period_id, payment_status) 
WHERE payment_period_id IS NOT NULL;

-- 5. Actualizar loads existentes según su estado actual
-- Si tiene payment_period_id, considerarlo 'approved'
UPDATE loads 
SET payment_status = 'approved'
WHERE payment_period_id IS NOT NULL 
  AND payment_status = 'pending';

-- 6. Marcar como 'applied' las cargas de payrolls ya pagados
UPDATE loads l
SET 
  payment_status = 'applied',
  updated_at = now()
WHERE 
  l.payment_period_id IS NOT NULL
  AND l.payment_status = 'approved'
  AND EXISTS (
    SELECT 1 
    FROM user_payrolls up
    WHERE up.user_id = l.driver_user_id
      AND up.company_payment_period_id = l.payment_period_id
      AND up.payment_status = 'paid'
  );

-- 7. Eliminar y recrear función mark_driver_as_paid_with_validation
DROP FUNCTION IF EXISTS mark_driver_as_paid_with_validation(UUID, TEXT, TEXT, TEXT);

CREATE FUNCTION mark_driver_as_paid_with_validation(
  p_calculation_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_payment_date DATE;
  v_result JSONB;
  v_updated_loads INTEGER;
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

  -- Marcar loads como 'applied' (inmutables)
  UPDATE loads
  SET 
    payment_status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND payment_status = 'approved';

  GET DIAGNOSTICS v_updated_loads = ROW_COUNT;

  -- Marcar fuel_expenses como 'applied'
  UPDATE fuel_expenses
  SET 
    status = 'applied',
    updated_at = now()
  WHERE driver_user_id = v_user_id
    AND payment_period_id = v_period_id
    AND status = 'approved';

  RETURN jsonb_build_object(
    'success', true,
    'updated_loads', v_updated_loads
  );
END;
$$;

-- 8. Eliminar y recrear función mark_multiple_drivers_as_paid_with_validation
DROP FUNCTION IF EXISTS mark_multiple_drivers_as_paid_with_validation(UUID[], TEXT, TEXT, TEXT);

CREATE FUNCTION mark_multiple_drivers_as_paid_with_validation(
  p_calculation_ids UUID[],
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calc_id UUID;
  v_user_id UUID;
  v_period_id UUID;
  v_payment_date DATE;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_updated_loads INTEGER := 0;
  v_loads_this_calc INTEGER;
BEGIN
  v_payment_date := CURRENT_DATE;

  FOREACH v_calc_id IN ARRAY p_calculation_ids
  LOOP
    BEGIN
      SELECT user_id, company_payment_period_id 
      INTO v_user_id, v_period_id
      FROM user_payrolls 
      WHERE id = v_calc_id;

      IF v_user_id IS NULL THEN
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'calculation_id', v_calc_id,
          'error', 'CALCULATION_NOT_FOUND'
        );
        CONTINUE;
      END IF;

      -- Actualizar payroll
      UPDATE user_payrolls
      SET 
        payment_status = 'paid',
        payment_date = v_payment_date,
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        payment_notes = p_notes,
        updated_at = now()
      WHERE id = v_calc_id
        AND payment_status != 'paid';

      -- Marcar loads como 'applied'
      UPDATE loads
      SET 
        payment_status = 'applied',
        updated_at = now()
      WHERE driver_user_id = v_user_id
        AND payment_period_id = v_period_id
        AND payment_status = 'approved';
      
      GET DIAGNOSTICS v_loads_this_calc = ROW_COUNT;
      v_updated_loads := v_updated_loads + v_loads_this_calc;

      -- Marcar fuel_expenses como 'applied'
      UPDATE fuel_expenses
      SET 
        status = 'applied',
        updated_at = now()
      WHERE driver_user_id = v_user_id
        AND payment_period_id = v_period_id
        AND status = 'approved';

      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'calculation_id', v_calc_id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'success_count', v_success_count,
    'error_count', v_error_count,
    'errors', v_errors,
    'updated_loads', v_updated_loads
  );
END;
$$;

COMMENT ON COLUMN loads.payment_status IS 'Estado financiero: pending (nueva) → approved (en período) → applied (payroll pagado, INMUTABLE)';
COMMENT ON FUNCTION mark_driver_as_paid_with_validation IS 'Marca payroll como pagado y actualiza payment_status de loads y fuel_expenses a applied (inmutable)';
COMMENT ON FUNCTION mark_multiple_drivers_as_paid_with_validation IS 'Marca múltiples payrolls como pagados y actualiza payment_status de sus loads y fuel_expenses a applied';