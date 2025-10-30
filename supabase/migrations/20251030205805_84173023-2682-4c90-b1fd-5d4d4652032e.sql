
-- Eliminar período vacío de 2026 manualmente
DO $$
BEGIN
  DELETE FROM company_payment_periods 
  WHERE id = 'ce20fe3b-43c6-4140-8af6-6d52cdc5585f';
END $$;
