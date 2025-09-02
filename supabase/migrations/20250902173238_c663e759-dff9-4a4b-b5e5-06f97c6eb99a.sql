-- Force another recalculation to see what happens
SELECT auto_recalculate_driver_payment_period_v2(
  '484d83b3-b928-46b3-9705-db225ddb9b0c'::uuid,
  '49cb0343-7af4-4df0-b31e-75380709c58e'::uuid
)