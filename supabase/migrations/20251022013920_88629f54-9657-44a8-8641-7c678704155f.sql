-- Actualizar fuel_expenses asociados a user_payrolls pagados
-- Marcar como 'applied' todas las transacciones vinculadas a payrolls con status 'paid'

UPDATE fuel_expenses
SET 
  status = 'applied',
  updated_at = now()
WHERE 
  payment_period_id IN (
    SELECT company_payment_period_id 
    FROM user_payrolls 
    WHERE payment_status = 'paid'
  )
  AND status != 'applied';

-- Log de cuántos registros se actualizaron
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % fuel expense records to applied status', updated_count;
END $$;