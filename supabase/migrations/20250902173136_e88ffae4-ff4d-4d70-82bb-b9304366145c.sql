-- Debug: Check what loads are being found for the driver and period
SELECT 
  l.id,
  l.total_amount,
  l.status,
  l.driver_user_id,
  l.payment_period_id,
  'Valid for calculation' as note
FROM loads l
WHERE l.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
  AND l.status NOT IN ('cancelled', 'rejected')
  AND l.total_amount > 0