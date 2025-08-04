-- Deshabilitar temporalmente los triggers que causan problemas
ALTER TABLE fuel_expenses DISABLE TRIGGER auto_recalculate_trigger;
ALTER TABLE loads DISABLE TRIGGER auto_recalculate_trigger;

-- Ahora eliminar sin problemas
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
DELETE FROM fuel_expenses 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
DELETE FROM loads 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id IN (SELECT id FROM current_and_next_periods)
);

WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (SELECT id FROM current_and_next_periods);

DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND status = 'open';

-- Rehabilitar los triggers
ALTER TABLE fuel_expenses ENABLE TRIGGER auto_recalculate_trigger;
ALTER TABLE loads ENABLE TRIGGER auto_recalculate_trigger;