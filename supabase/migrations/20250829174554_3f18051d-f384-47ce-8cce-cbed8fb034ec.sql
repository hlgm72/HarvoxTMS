-- Eliminar el período 36 que se recreó automáticamente
DELETE FROM company_payment_periods 
WHERE period_start_date >= '2025-09-01';

-- Limpiar calculations huérfanos
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id NOT IN (
  SELECT id FROM company_payment_periods
);