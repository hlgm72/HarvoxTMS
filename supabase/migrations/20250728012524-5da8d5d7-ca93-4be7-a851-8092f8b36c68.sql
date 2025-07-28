-- Solución alternativa: crear una nueva tabla temporal, insertar datos corregidos, 
-- y luego reemplazar la tabla original

-- 1. Crear tabla temporal con la estructura correcta
CREATE TABLE fuel_expenses_temp AS 
SELECT * FROM fuel_expenses WHERE 1=0; -- Solo estructura, sin datos

-- 2. Eliminar foreign key constraint de la tabla temporal
ALTER TABLE fuel_expenses_temp 
DROP CONSTRAINT IF EXISTS fuel_expenses_payment_period_id_fkey;

-- 3. Función para encontrar el período correcto
CREATE OR REPLACE FUNCTION find_driver_period_calculation(
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

-- 4. Insertar datos corregidos en la tabla temporal
INSERT INTO fuel_expenses_temp (
  id, driver_user_id, vehicle_id, transaction_date, fuel_type, gallons_purchased,
  price_per_gallon, total_amount, gross_amount, discount_amount, fees, 
  station_name, station_state, card_last_five, invoice_number, receipt_url,
  notes, status, is_verified, verified_by, verified_at, payment_period_id,
  raw_webhook_data, created_by, created_at, updated_at
)
SELECT 
  fe.id, fe.driver_user_id, fe.vehicle_id, fe.transaction_date, fe.fuel_type, 
  fe.gallons_purchased, fe.price_per_gallon, fe.total_amount, fe.gross_amount, 
  fe.discount_amount, fe.fees, fe.station_name, fe.station_state, fe.card_last_five,
  fe.invoice_number, fe.receipt_url, fe.notes, fe.status, fe.is_verified, 
  fe.verified_by, fe.verified_at,
  -- Aquí está la corrección: usar el ID correcto
  find_driver_period_calculation(fe.driver_user_id, fe.transaction_date::date) as payment_period_id,
  fe.raw_webhook_data, fe.created_by, fe.created_at, now() as updated_at
FROM fuel_expenses fe
WHERE fe.driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
)
AND find_driver_period_calculation(fe.driver_user_id, fe.transaction_date::date) IS NOT NULL;

-- 5. Eliminar datos antiguos de la empresa específica
DELETE FROM fuel_expenses 
WHERE driver_user_id IN (
  SELECT ucr.user_id 
  FROM user_company_roles ucr 
  WHERE ucr.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' 
  AND ucr.is_active = true
);

-- 6. Insertar datos corregidos de vuelta
INSERT INTO fuel_expenses SELECT * FROM fuel_expenses_temp;

-- 7. Eliminar tabla temporal
DROP TABLE fuel_expenses_temp;

-- 8. Limpiar función
DROP FUNCTION find_driver_period_calculation(UUID, DATE);