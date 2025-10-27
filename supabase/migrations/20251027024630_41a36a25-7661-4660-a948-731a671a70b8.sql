-- Eliminar período huérfano Week 18 (2025-04-28 a 2025-05-04)
-- Este período se creó por error sin transacciones asociadas

DELETE FROM company_payment_periods 
WHERE id = '6f89756e-fe01-41a0-bcbe-cd816dac16ed'
  AND period_start_date = '2025-04-28'
  AND period_end_date = '2025-05-04'
  -- Verificación de seguridad: solo eliminar si no tiene datos asociados
  AND NOT EXISTS (
    SELECT 1 FROM user_payrolls WHERE company_payment_period_id = '6f89756e-fe01-41a0-bcbe-cd816dac16ed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM loads WHERE payment_period_id = '6f89756e-fe01-41a0-bcbe-cd816dac16ed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM fuel_expenses WHERE payment_period_id = '6f89756e-fe01-41a0-bcbe-cd816dac16ed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM expense_instances WHERE payment_period_id = '6f89756e-fe01-41a0-bcbe-cd816dac16ed'
  );