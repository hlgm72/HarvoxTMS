
-- Corregir la función para usar la función correcta de recálculo
CREATE OR REPLACE FUNCTION force_recalculate_period(
  p_payment_period_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_driver_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Obtener todos los drivers únicos en este período
  FOR v_driver_id IN 
    SELECT DISTINCT driver_user_id 
    FROM loads 
    WHERE payment_period_id = p_payment_period_id
      AND driver_user_id IS NOT NULL
  LOOP
    -- Recalcular para cada driver usando la función correcta
    PERFORM auto_recalculate_driver_payment_period(
      v_driver_id,
      p_payment_period_id
    );
    
    v_count := v_count + 1;
    RAISE LOG 'Recalculado período % para driver %', p_payment_period_id, v_driver_id;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'period_id', p_payment_period_id,
    'drivers_recalculated', v_count,
    'message', 'Período recalculado exitosamente'
  );
  
  RETURN v_result;
END;
$$;

-- Ejecutar el recálculo para el período actual
SELECT force_recalculate_period('becd3770-526a-41cc-8e1e-eb35764c90ac');
