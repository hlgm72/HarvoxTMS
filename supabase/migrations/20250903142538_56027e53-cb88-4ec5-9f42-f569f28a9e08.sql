-- Corregir vinculación de cargas al driver_period_calculation correcto
-- El problema es que las cargas apuntan al company_payment_period en lugar del driver_period_calculation

-- Actualizar cargas para que apunten al driver_period_calculation del conductor correcto
UPDATE loads 
SET payment_period_id = (
  SELECT dpc.id 
  FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id = loads.payment_period_id 
    AND dpc.driver_user_id = loads.driver_user_id
  LIMIT 1
)
WHERE payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
  AND driver_user_id IN ('484d83b3-b928-46b3-9705-db225ddb9b0c', '087a825c-94ea-42d9-8388-5087a19d776f');

-- Ahora recalcular el período para el conductor que tiene las cargas
SELECT auto_recalculate_driver_payment_period_v2('484d83b3-b928-46b3-9705-db225ddb9b0c', '49cb0343-7af4-4df0-b31e-75380709c58e');