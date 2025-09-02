-- Completely delete period 35 and all associated data
-- Period ID: 39eee0b0-ef5c-4f2f-98fd-508a7269b885
-- Company ID: e5d52767-ca59-4c28-94e4-058aff6a037b
-- Week 35, August 25-31, 2025

-- 1. Delete all expense instances associated with driver calculations in this period
DELETE FROM expense_instances
WHERE payment_period_id IN (
  SELECT id FROM driver_period_calculations
  WHERE company_payment_period_id = '39eee0b0-ef5c-4f2f-98fd-508a7269b885'
);

-- 2. Delete all driver period calculations for this period
DELETE FROM driver_period_calculations
WHERE company_payment_period_id = '39eee0b0-ef5c-4f2f-98fd-508a7269b885';

-- 3. Update any loads that might reference this period to NULL
UPDATE loads
SET payment_period_id = NULL
WHERE payment_period_id = '39eee0b0-ef5c-4f2f-98fd-508a7269b885';

-- 4. Delete the payment period itself
DELETE FROM company_payment_periods
WHERE id = '39eee0b0-ef5c-4f2f-98fd-508a7269b885';

-- Log the cleanup for audit purposes
INSERT INTO archive_logs (
  operation_type,
  table_name,
  details,
  records_affected,
  status
) VALUES (
  'MANUAL_CLEANUP_PERIOD',
  'company_payment_periods',
  jsonb_build_object(
    'period_id', '39eee0b0-ef5c-4f2f-98fd-508a7269b885',
    'company_id', 'e5d52767-ca59-4c28-94e4-058aff6a037b',
    'week_number', 35,
    'year', 2025,
    'reason', 'Complete period deletion requested by user',
    'period_dates', jsonb_build_object(
      'start', '2025-08-25',
      'end', '2025-08-31'
    )
  ),
  1,
  'completed'
);