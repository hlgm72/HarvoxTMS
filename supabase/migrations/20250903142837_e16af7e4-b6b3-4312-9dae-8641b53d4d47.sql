-- Actualizar directamente los cálculos existentes con las cargas encontradas
-- Primero, obtener los totales correctos de las cargas

UPDATE driver_period_calculations 
SET 
  gross_earnings = COALESCE((
    SELECT SUM(l.total_amount) 
    FROM loads l 
    WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
      AND l.driver_user_id = driver_period_calculations.driver_user_id
      AND l.status != 'cancelled'
  ), 0),
  total_income = COALESCE((
    SELECT SUM(l.total_amount) 
    FROM loads l 
    WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
      AND l.driver_user_id = driver_period_calculations.driver_user_id
      AND l.status != 'cancelled'
  ), 0),
  net_payment = COALESCE((
    SELECT SUM(l.total_amount) 
    FROM loads l 
    WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
      AND l.driver_user_id = driver_period_calculations.driver_user_id
      AND l.status != 'cancelled'
  ), 0) - fuel_expenses - total_deductions,
  has_negative_balance = (
    COALESCE((
      SELECT SUM(l.total_amount) 
      FROM loads l 
      WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
        AND l.driver_user_id = driver_period_calculations.driver_user_id
        AND l.status != 'cancelled'
    ), 0) - fuel_expenses - total_deductions
  ) < 0,
  calculated_at = now(),
  updated_at = now()
WHERE company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';

-- Verificar los resultados
SELECT 
  dpc.driver_user_id,
  dpc.gross_earnings,
  dpc.total_income,
  dpc.fuel_expenses,
  dpc.total_deductions,
  dpc.net_payment,
  dpc.has_negative_balance,
  (SELECT COUNT(*) FROM loads l WHERE l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e' AND l.driver_user_id = dpc.driver_user_id) as load_count
FROM driver_period_calculations dpc
WHERE dpc.company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';