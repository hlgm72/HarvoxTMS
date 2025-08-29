-- Eliminar períodos de pago futuros (posteriores a la fecha actual)
-- Solo mantener períodos hasta la fecha actual

DELETE FROM company_payment_periods 
WHERE period_start_date > CURRENT_DATE;

-- También limpiar cualquier calculation asociado a períodos futuros que ya no existen
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id NOT IN (
  SELECT id FROM company_payment_periods
);