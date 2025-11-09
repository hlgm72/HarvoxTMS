
-- ===============================================
-- 🔒 INMUTABILIDAD DE PAYROLL - Corrección de Deducciones
-- ===============================================
-- Marca todas las deducciones como 'applied' cuando el payroll
-- del usuario ya está marcado como 'paid', respetando la inmutabilidad.

UPDATE expense_instances ei
SET 
  status = 'applied',
  applied_at = COALESCE(ei.applied_at, NOW()),
  updated_at = NOW()
FROM user_payrolls up
WHERE ei.payment_period_id = up.company_payment_period_id 
  AND ei.user_id = up.user_id
  AND up.payment_status = 'paid'
  AND (ei.status IS NULL OR ei.status != 'applied');

-- Log de la operación
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE '✅ Actualizadas % deducciones a status=applied para respetar inmutabilidad del payroll', affected_count;
END $$;
