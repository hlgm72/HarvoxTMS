-- CORRECCIÓN: Revertir y aplicar correctamente el status 'applied'
-- Solo marcar como 'applied' las fuel_expenses cuyo driver específico tiene payroll pagado

-- Paso 1: Revertir todas las fuel_expenses a 'approved' 
-- (asumiendo que si tienen payment_period_id ya fueron aprobadas)
UPDATE fuel_expenses
SET 
  status = 'approved',
  updated_at = now()
WHERE 
  payment_period_id IS NOT NULL
  AND status = 'applied';

-- Paso 2: Marcar correctamente como 'applied' solo las transacciones 
-- donde el driver específico tiene su payroll marcado como 'paid'
UPDATE fuel_expenses fe
SET 
  status = 'applied',
  updated_at = now()
WHERE 
  fe.payment_period_id IS NOT NULL
  AND fe.status = 'approved'
  AND EXISTS (
    SELECT 1 
    FROM user_payrolls up
    WHERE up.user_id = fe.driver_user_id
      AND up.company_payment_period_id = fe.payment_period_id
      AND up.payment_status = 'paid'
  );

-- Log de resultados
DO $$
DECLARE
  applied_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO applied_count
  FROM fuel_expenses
  WHERE status = 'applied';
  
  RAISE NOTICE 'Corrected: % fuel expense records now have applied status', applied_count;
END $$;