-- Eliminar períodos de pago y sus dependencias en el orden correcto
-- Primero, eliminar las instancias de gastos
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
);

-- Luego, actualizar fuel_expenses para quitar referencias a períodos que vamos a eliminar
UPDATE fuel_expenses 
SET payment_period_id = NULL 
WHERE payment_period_id IN (
  SELECT cpp.id FROM company_payment_periods cpp
  WHERE cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
);

-- Actualizar loads para quitar referencias a períodos que vamos a eliminar  
UPDATE loads 
SET payment_period_id = NULL 
WHERE payment_period_id IN (
  SELECT cpp.id FROM company_payment_periods cpp
  WHERE cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
);

-- Eliminar las calculaciones de conductores
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
);

-- Finalmente, eliminar los períodos de pago
DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b';