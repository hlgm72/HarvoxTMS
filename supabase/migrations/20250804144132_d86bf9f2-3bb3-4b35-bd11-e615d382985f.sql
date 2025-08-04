-- Eliminar todos los períodos de pago existentes para probar la regeneración con fechas correctas
DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b';

-- También eliminar las calculaciones de conductores asociadas
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id NOT IN (
  SELECT id FROM company_payment_periods
);