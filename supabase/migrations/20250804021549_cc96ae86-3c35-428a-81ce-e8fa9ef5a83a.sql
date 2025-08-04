-- First, let's create the missing driver_period_calculations record
INSERT INTO driver_period_calculations (
  driver_user_id,
  company_payment_period_id,
  gross_earnings,
  fuel_expenses,
  other_income,
  total_deductions,
  has_negative_balance,
  payment_status
) 
SELECT 
  '087a825c-94ea-42d9-8388-5087a19d776f',
  '344d35bd-3858-4e19-ac7c-f223d02fa7e3',
  0,
  0,
  0,
  0,
  false,
  'calculated'
WHERE NOT EXISTS (
  SELECT 1 FROM driver_period_calculations 
  WHERE driver_user_id = '087a825c-94ea-42d9-8388-5087a19d776f' 
  AND company_payment_period_id = '344d35bd-3858-4e19-ac7c-f223d02fa7e3'
);

-- Now update the other_income record to point to the correct driver_period_calculations record
UPDATE other_income 
SET payment_period_id = (
  SELECT dpc.id 
  FROM driver_period_calculations dpc 
  WHERE dpc.driver_user_id = '087a825c-94ea-42d9-8388-5087a19d776f' 
  AND dpc.company_payment_period_id = '344d35bd-3858-4e19-ac7c-f223d02fa7e3'
)
WHERE id = '544348fb-8d40-4dac-af02-a5100d478575';