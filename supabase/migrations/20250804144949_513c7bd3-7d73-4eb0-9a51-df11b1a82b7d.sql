-- Eliminar el período actual y el siguiente para la empresa específica
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
-- Primero eliminar las instancias de gastos
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id IN (SELECT id FROM current_and_next_periods)
);

-- Actualizar fuel_expenses para quitar referencias
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
UPDATE fuel_expenses 
SET payment_period_id = NULL 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Actualizar loads para quitar referencias
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
UPDATE loads 
SET payment_period_id = NULL 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Eliminar las calculaciones de conductores
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

-- Finalmente eliminar los períodos
DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND status = 'open'
AND id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
);