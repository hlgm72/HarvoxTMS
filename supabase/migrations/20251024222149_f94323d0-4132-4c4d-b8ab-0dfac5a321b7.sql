
-- Función para forzar recálculo manual de un período específico
-- Útil cuando hay inconsistencias en los cálculos
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
BEGIN
  -- Obtener todos los drivers únicos en este período
  FOR v_driver_id IN 
    SELECT DISTINCT driver_user_id 
    FROM loads 
    WHERE payment_period_id = p_payment_period_id
      AND driver_user_id IS NOT NULL
  LOOP
    -- Recalcular para cada driver
    PERFORM calculate_user_payment_period_with_validation(
      p_payment_period_id,
      v_driver_id
    );
    
    RAISE LOG 'Recalculado período % para driver %', p_payment_period_id, v_driver_id;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'period_id', p_payment_period_id,
    'message', 'Período recalculado exitosamente'
  );
  
  RETURN v_result;
END;
$$;
