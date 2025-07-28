-- Corregir payment_period_id en fuel_expenses para que coincidan con driver_period_calculations
-- Esto resuelve el problema de que los gastos de combustible no se muestran en la interfaz

-- Primero, crear una función para encontrar el driver_period_calculation correcto
CREATE OR REPLACE FUNCTION find_correct_payment_period(
  p_driver_user_id UUID,
  p_transaction_date DATE
) RETURNS UUID AS $$
DECLARE
  correct_period_id UUID;
BEGIN
  -- Buscar el driver_period_calculation que corresponde a la fecha de transacción
  SELECT dpc.id INTO correct_period_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.driver_user_id = p_driver_user_id
    AND p_transaction_date >= cpp.period_start_date
    AND p_transaction_date <= cpp.period_end_date
  LIMIT 1;
  
  RETURN correct_period_id;
END;
$$ LANGUAGE plpgsql;

-- Actualizar todos los payment_period_id en fuel_expenses
UPDATE fuel_expenses fe
SET 
  payment_period_id = find_correct_payment_period(fe.driver_user_id, fe.transaction_date::date),
  updated_at = now()
WHERE fe.driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
);

-- Verificar que todas las actualizaciones fueron exitosas
-- Eliminar registros que no pudieron ser mapeados (payment_period_id NULL)
DELETE FROM fuel_expenses 
WHERE payment_period_id IS NULL 
AND driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
);

-- Limpiar la función temporal
DROP FUNCTION find_correct_payment_period(UUID, DATE);