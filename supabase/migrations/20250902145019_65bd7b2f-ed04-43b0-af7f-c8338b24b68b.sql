-- ===============================================
-- 🔧 RECÁLCULO DIRECTO Y SIMPLE
-- Actualizar directamente el cálculo del período
-- ===============================================

-- Recálculo directo usando UPDATE con subqueries
UPDATE driver_period_calculations 
SET 
  gross_earnings = (
    SELECT COALESCE(SUM(l.total_amount), 0)
    FROM loads l
    WHERE l.driver_user_id = driver_period_calculations.driver_user_id
      AND l.payment_period_id = driver_period_calculations.company_payment_period_id
      AND l.status NOT IN ('cancelled', 'rejected')
  ),
  other_income = (
    SELECT COALESCE(SUM(oi.amount), 0)
    FROM other_income oi
    WHERE oi.user_id = driver_period_calculations.driver_user_id
      AND oi.payment_period_id = driver_period_calculations.id
  ),
  fuel_expenses = (
    SELECT COALESCE(SUM(fe.total_amount), 0)
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = driver_period_calculations.driver_user_id
      AND fe.payment_period_id = driver_period_calculations.id
  ),
  total_deductions = (
    SELECT COALESCE(SUM(ei.amount), 0)
    FROM expense_instances ei
    WHERE ei.user_id = driver_period_calculations.driver_user_id
      AND ei.payment_period_id = driver_period_calculations.id
      AND ei.status = 'applied'
  ),
  updated_at = now()
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';

-- Actualizar campos calculados
UPDATE driver_period_calculations 
SET 
  total_income = gross_earnings + other_income,
  net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions,
  has_negative_balance = ((gross_earnings + other_income) - fuel_expenses - total_deductions) < 0,
  updated_at = now()
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';

-- Verificar resultados
SELECT 
    'DESPUÉS DEL RECÁLCULO DIRECTO' as status,
    dpc.gross_earnings,
    dpc.fuel_expenses,
    dpc.total_deductions,
    dpc.other_income,
    dpc.total_income,
    dpc.net_payment,
    dpc.has_negative_balance
FROM driver_period_calculations dpc 
WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
AND dpc.company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';