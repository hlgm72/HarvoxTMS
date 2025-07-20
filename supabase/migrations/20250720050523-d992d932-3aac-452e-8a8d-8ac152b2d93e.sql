-- Eliminar períodos de pago vacíos (sin datos asociados)
DELETE FROM public.payment_periods 
WHERE id IN (
  SELECT pp.id 
  FROM public.payment_periods pp
  WHERE pp.is_locked = false 
  AND pp.status = 'open'
  AND NOT EXISTS (SELECT 1 FROM public.loads WHERE payment_period_id = pp.id)
  AND NOT EXISTS (SELECT 1 FROM public.fuel_expenses WHERE payment_period_id = pp.id)
  AND NOT EXISTS (SELECT 1 FROM public.expense_instances WHERE payment_period_id = pp.id)
  AND NOT EXISTS (SELECT 1 FROM public.other_income WHERE payment_period_id = pp.id)
);