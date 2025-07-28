-- Corregir payment_period_id en fuel_expenses sin activar triggers automáticos
-- Necesitamos hacer esto sin activar los triggers de recálculo

-- 1. Deshabilitar el trigger temporalmente
ALTER TABLE fuel_expenses DISABLE TRIGGER auto_recalculate_on_fuel_expenses_trigger;

-- 2. Eliminar la foreign key constraint incorrecta
ALTER TABLE fuel_expenses 
DROP CONSTRAINT IF EXISTS fuel_expenses_payment_period_id_fkey;

-- 3. Crear función de mapeo
CREATE OR REPLACE FUNCTION find_correct_payment_period(
  p_driver_user_id UUID,
  p_transaction_date DATE
) RETURNS UUID AS $$
DECLARE
  correct_period_id UUID;
BEGIN
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

-- 4. Actualizar payment_period_id sin activar triggers
UPDATE fuel_expenses fe
SET payment_period_id = find_correct_payment_period(fe.driver_user_id, fe.transaction_date::date)
WHERE fe.driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
);

-- 5. Eliminar registros que no pudieron ser mapeados
DELETE FROM fuel_expenses 
WHERE payment_period_id IS NULL 
AND driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
);

-- 6. Agregar foreign key constraint correcto
ALTER TABLE fuel_expenses 
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES driver_period_calculations(id) 
ON DELETE CASCADE;

-- 7. Reactivar el trigger
ALTER TABLE fuel_expenses ENABLE TRIGGER auto_recalculate_on_fuel_expenses_trigger;

-- 8. Limpiar función temporal
DROP FUNCTION find_correct_payment_period(UUID, DATE);