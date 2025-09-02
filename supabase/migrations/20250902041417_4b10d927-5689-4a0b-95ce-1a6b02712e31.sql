-- Clean up incorrectly calculated percentage deductions (the duplicated ones)
-- Delete percentage deductions that were incorrectly calculated
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id 
  FROM driver_period_calculations dpc 
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND cpp.period_start_date >= '2025-08-25'
)
AND expense_type_id IN (
  SELECT id FROM expense_types 
  WHERE category = 'percentage_deduction'
  AND (name ILIKE '%factoring%' OR name ILIKE '%dispatch%' OR name ILIKE '%leas%')
)
AND description ILIKE '%multiple loads%';