-- Corregir fechas de pago incorrectas en user_payrolls
-- Las fechas de pago deben ser DESPUÉS del fin del período, no durante o antes

-- Actualizar todos los user_payrolls que tienen payment_date incorrecta
UPDATE user_payrolls up
SET payment_date = get_payment_date_for_period(up.company_payment_period_id)
FROM company_payment_periods cpp
WHERE up.company_payment_period_id = cpp.id
  AND up.payment_date IS NOT NULL
  AND up.payment_date <= cpp.period_end_date;

-- Log para verificar cuántos registros se corrigieron
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Corregidas % fechas de pago incorrectas en user_payrolls', updated_count;
END $$;