-- Eliminar el período 35 (semana 25-31 agosto 2025) que se escapó en la limpieza anterior

-- Primero eliminar las calculations de conductores para este período
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE period_start_date = '2025-08-25' AND period_end_date = '2025-08-31'
);

-- Eliminar las expense_instances relacionadas
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE period_start_date = '2025-08-25' AND period_end_date = '2025-08-31'
);

-- Finalmente eliminar el período mismo
DELETE FROM company_payment_periods 
WHERE period_start_date = '2025-08-25' AND period_end_date = '2025-08-31';