-- Fix percentage deductions period assignment - move existing deductions to correct period

-- Move the existing percentage deductions from Week 37 to Week 36 (correct period)
UPDATE expense_instances
SET payment_period_id = '2786c1a9-c6cf-43fe-ade2-27e614f0a57a' -- Week 36 DPC ID for this driver
WHERE user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND description IN ('Leasing fees', 'Factoring fees', 'Dispatching fees')
  AND payment_period_id IN (
    -- Find DPC IDs from Week 37 (incorrect period)
    SELECT dpc.id 
    FROM driver_period_calculations dpc 
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.period_start_date = '2025-09-08' 
      AND cpp.period_end_date = '2025-09-14'
  );