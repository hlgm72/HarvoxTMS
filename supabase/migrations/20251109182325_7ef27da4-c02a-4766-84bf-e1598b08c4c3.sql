-- Corregir fecha de pago incorrecta para el período 09/01-09/07/2025
-- La fecha correcta debe ser 09/12/2025 (viernes después del fin del período)

UPDATE user_payrolls
SET payment_date = '2025-09-12'
WHERE company_payment_period_id = '960e3156-f0ed-4c14-83c2-8e0a40bfbbb0'
  AND payment_date = '2025-09-09';

-- Verificar si hay más registros con el mismo problema
UPDATE user_payrolls up
SET payment_date = get_payment_date_for_period(up.company_payment_period_id)
FROM company_payment_periods cpp
WHERE up.company_payment_period_id = cpp.id
  AND up.payment_date IS NOT NULL
  AND up.payment_date < cpp.period_end_date;