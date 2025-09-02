-- Test manual execution of the function
SELECT auto_recalculate_driver_payment_period_v2(
  '484d83b3-b928-46b3-9705-db225ddb9b0c'::UUID,
  '49cb0343-7af4-4df0-b31e-75380709c58e'::UUID
);

-- Check the result
SELECT gross_earnings, total_income, net_payment, total_deductions 
FROM driver_period_calculations 
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c' 
AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';