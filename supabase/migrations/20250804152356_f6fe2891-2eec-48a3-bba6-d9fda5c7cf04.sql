-- Deshabilitar TODOS los triggers de la base de datos temporalmente
SET session_replication_role = replica;

-- Eliminar directamente
DELETE FROM fuel_expenses 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM loads 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id IN (
    SELECT id FROM company_payment_periods 
    WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
    AND status = 'open'
  )
);

DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND status = 'open';

-- Rehabilitar todos los triggers
SET session_replication_role = DEFAULT;