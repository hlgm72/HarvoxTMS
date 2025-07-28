-- Corregir payment_period_id en fuel_expenses
-- Hacer la migración sin preocuparse por triggers específicos

-- 1. Eliminar foreign key constraint actual
ALTER TABLE fuel_expenses 
DROP CONSTRAINT IF EXISTS fuel_expenses_payment_period_id_fkey;

-- 2. Crear función de mapeo
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

-- 3. Actualizar payment_period_id usando una transacción controlada
DO $$
DECLARE
  fe_record RECORD;
  new_period_id UUID;
BEGIN
  -- Recorrer cada fuel_expense y actualizar uno por uno
  FOR fe_record IN 
    SELECT fe.id, fe.driver_user_id, fe.transaction_date::date as tx_date
    FROM fuel_expenses fe
    WHERE fe.driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
      AND ucr.is_active = true
    )
  LOOP
    -- Encontrar el period correcto
    SELECT find_correct_payment_period(fe_record.driver_user_id, fe_record.tx_date) 
    INTO new_period_id;
    
    -- Solo actualizar si encontramos un period válido
    IF new_period_id IS NOT NULL THEN
      UPDATE fuel_expenses 
      SET payment_period_id = new_period_id
      WHERE id = fe_record.id;
    END IF;
  END LOOP;
END
$$;

-- 4. Eliminar registros que no pudieron ser mapeados
DELETE FROM fuel_expenses 
WHERE payment_period_id IS NULL 
AND driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
);

-- 5. Agregar foreign key constraint correcto
ALTER TABLE fuel_expenses 
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES driver_period_calculations(id) 
ON DELETE CASCADE;

-- 6. Limpiar función temporal
DROP FUNCTION find_correct_payment_period(UUID, DATE);