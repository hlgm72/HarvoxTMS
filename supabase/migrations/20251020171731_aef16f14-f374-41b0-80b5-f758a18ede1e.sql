-- Actualizar expense_instances que están en 'planned' pero cuyos payrolls ya están pagados
-- Esto corrige el problema donde las instancias no se actualizaron cuando se marcó el payroll como pagado

UPDATE expense_instances ei
SET 
  status = 'applied',
  applied_at = up.paid_at
FROM user_payrolls up
WHERE ei.payment_period_id = up.company_payment_period_id
  AND ei.user_id = up.user_id
  AND ei.status = 'planned'
  AND up.payment_status = 'paid';