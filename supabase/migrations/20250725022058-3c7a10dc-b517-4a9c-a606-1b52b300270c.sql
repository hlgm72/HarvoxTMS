-- Eliminar los cálculos de conductor asociados a los períodos de agosto
DELETE FROM public.driver_period_calculations 
WHERE company_payment_period_id IN (
  SELECT id FROM public.company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND period_start_date >= '2025-08-01'
);

-- Eliminar los períodos de agosto innecesarios
DELETE FROM public.company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND period_start_date >= '2025-08-01';