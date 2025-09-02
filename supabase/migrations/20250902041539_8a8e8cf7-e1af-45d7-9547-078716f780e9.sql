-- Recalculate driver period totals after cleaning up bad deductions
-- Update driver period calculations with correct totals
UPDATE driver_period_calculations 
SET 
  total_deductions = (
    SELECT COALESCE(SUM(ei.amount), 0)
    FROM expense_instances ei
    WHERE ei.payment_period_id = driver_period_calculations.id
    AND ei.status = 'applied'
  ),
  net_payment = (
    SELECT 
      COALESCE(SUM(l.total_amount), 0) - COALESCE(SUM(ei.amount), 0)
    FROM loads l
    LEFT JOIN expense_instances ei ON ei.payment_period_id = driver_period_calculations.id AND ei.status = 'applied'
    WHERE l.payment_period_id = driver_period_calculations.company_payment_period_id
    AND l.driver_user_id = driver_period_calculations.driver_user_id
  ),
  gross_earnings = (
    SELECT COALESCE(SUM(l.total_amount), 0)
    FROM loads l
    WHERE l.payment_period_id = driver_period_calculations.company_payment_period_id
    AND l.driver_user_id = driver_period_calculations.driver_user_id
  ),
  updated_at = now()
WHERE company_payment_period_id IN (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND period_start_date >= '2025-08-25'
);