-- Remove incorrect recurring deductions from period 35 (week 35, 2025-08-25 to 2025-08-31)
-- These deductions were incorrectly applied to this period

DELETE FROM expense_instances 
WHERE id IN (
  SELECT ei.id
  FROM expense_instances ei
  JOIN expense_types et ON ei.expense_type_id = et.id
  JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
    AND cpp.period_start_date = '2025-08-25'
    AND cpp.period_end_date = '2025-08-31'
    -- Only remove non-percentage deductions (recurring deductions)
    AND et.category != 'percentage_deduction'
);

-- Recalculate driver period totals after removing incorrect deductions
WITH period_calculations AS (
  SELECT 
    dpc.id as calc_id,
    dpc.driver_user_id,
    -- Gross earnings from loads
    COALESCE(SUM(l.total_amount), 0) as calculated_gross_earnings,
    -- Fuel expenses
    COALESCE(SUM(fe.total_amount), 0) as calculated_fuel_expenses,
    -- Total deductions (only percentage deductions now)
    COALESCE(SUM(ei.amount), 0) as calculated_total_deductions
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  LEFT JOIN loads l ON l.driver_user_id = dpc.driver_user_id 
    AND l.payment_period_id = cpp.id
  LEFT JOIN fuel_expenses fe ON fe.driver_user_id = dpc.driver_user_id 
    AND fe.payment_period_id = cpp.id
  LEFT JOIN expense_instances ei ON ei.payment_period_id = dpc.id
  WHERE cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
    AND cpp.period_start_date = '2025-08-25'
    AND cpp.period_end_date = '2025-08-31'
  GROUP BY dpc.id, dpc.driver_user_id
)
UPDATE driver_period_calculations dpc
SET 
  gross_earnings = pc.calculated_gross_earnings,
  fuel_expenses = pc.calculated_fuel_expenses,
  total_deductions = pc.calculated_total_deductions,
  total_income = pc.calculated_gross_earnings + other_income,
  net_payment = (pc.calculated_gross_earnings + other_income) - pc.calculated_fuel_expenses - pc.calculated_total_deductions,
  has_negative_balance = ((pc.calculated_gross_earnings + other_income) - pc.calculated_fuel_expenses - pc.calculated_total_deductions) < 0,
  updated_at = now()
FROM period_calculations pc
WHERE dpc.id = pc.calc_id;