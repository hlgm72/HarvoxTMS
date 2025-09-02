-- Debug and fix by manually updating the calculation record
UPDATE driver_period_calculations 
SET 
  gross_earnings = 2700.03,
  other_income = 0,
  fuel_expenses = 0,
  total_deductions = 351.00,
  total_income = 2700.03,
  net_payment = 2349.03,
  has_negative_balance = false,
  updated_at = now()
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'